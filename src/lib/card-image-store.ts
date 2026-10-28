"use client";

import * as React from "react";

const DATABASE_NAME = "grimorio-card-media";
const STORE_NAME = "card_images";
const DATABASE_VERSION = 1;
const IMAGE_SIZE = { width: 240, height: 400 } as const;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const IMAGE_UPDATED_EVENT = "grimorio:card-image-updated";

interface StoredCardImage {
  key: string;
  blob: Blob;
}

interface UseCardImageResult {
  src: string | null;
  isLoading: boolean;
  hasLocalImage: boolean;
  error: string | null;
}

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.reject(
      new Error("El almacenamiento local de imágenes no está disponible.")
    );
  }
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      databasePromise = null;
      reject(request.error ?? new Error("No se pudo abrir la biblioteca local de imágenes."));
    };
    request.onblocked = () => {
      databasePromise = null;
      reject(new Error("La biblioteca local de imágenes está bloqueada por otra pestaña."));
    };
  });

  return databasePromise;
}

function cardImageKey(deckId: string, cardId: string): string {
  return `${deckId}:${cardId}`;
}

function notifyImageUpdated(key: string): void {
  window.dispatchEvent(new CustomEvent(IMAGE_UPDATED_EVENT, { detail: { key } }));
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No se pudo leer la imagen seleccionada."));
    };
    image.src = objectUrl;
  });
}

async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  return loadImage(file);
}

function canvasToWebp(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("El navegador no pudo comprimir la imagen en WebP."));
          return;
        }
        if (blob.type !== "image/webp") {
          reject(new Error("Este navegador no puede exportar imágenes WebP."));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      0.78
    );
  });
}

export async function compressAndStoreCardImage(
  deckId: string,
  cardId: string,
  file: File
): Promise<string> {
  if (!deckId.trim() || !cardId.trim()) {
    throw new Error("El mazo y la carta son necesarios para guardar la imagen.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecciona un archivo de imagen válido.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("La imagen debe pesar 10 MB o menos.");
  }

  const source = await decodeImage(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = IMAGE_SIZE.width;
    canvas.height = IMAGE_SIZE.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo preparar el compresor de imágenes.");

    const sourceRatio = source.width / source.height;
    const targetRatio = IMAGE_SIZE.width / IMAGE_SIZE.height;
    const cropWidth = sourceRatio > targetRatio ? source.height * targetRatio : source.width;
    const cropHeight = sourceRatio > targetRatio ? source.height : source.width / targetRatio;
    const cropX = (source.width - cropWidth) / 2;
    const cropY = (source.height - cropHeight) / 2;
    context.drawImage(
      source,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      IMAGE_SIZE.width,
      IMAGE_SIZE.height
    );

    const blob = await canvasToWebp(canvas);
    const key = cardImageKey(deckId, cardId);
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put({ key, blob } satisfies StoredCardImage);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("No se pudo guardar la imagen local."));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("Se canceló el guardado de la imagen local."));
    });
    notifyImageUpdated(key);
    return key;
  } finally {
    if ("close" in source && typeof source.close === "function") source.close();
  }
}

export async function removeStoredCardImage(
  deckId: string,
  cardId: string
): Promise<void> {
  const key = cardImageKey(deckId, cardId);
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("No se pudo quitar la imagen local."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Se canceló la eliminación de la imagen local."));
  });
  notifyImageUpdated(key);
}

async function readStoredCardImage(key: string): Promise<Blob | null> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(key);
    request.onsuccess = () =>
      resolve((request.result as StoredCardImage | undefined)?.blob ?? null);
    request.onerror = () =>
      reject(request.error ?? new Error("No se pudo leer la imagen local."));
  });
}

export function useCardImage(
  deckId: string,
  cardId: string,
  staticFallbackUrl?: string | null
): UseCardImageResult {
  const key = React.useMemo(() => cardImageKey(deckId, cardId), [deckId, cardId]);
  const [result, setResult] = React.useState<{
    key: string | null;
    src: string | null;
    isLoading: boolean;
    error: string | null;
  }>({ key: null, src: null, isLoading: true, error: null });

  React.useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    const load = () => {
      void readStoredCardImage(key)
        .then((blob) => {
          if (!active) return;
          if (blob) {
            objectUrl = URL.createObjectURL(blob);
            setResult({ key, src: objectUrl, isLoading: false, error: null });
          } else {
            setResult({ key, src: null, isLoading: false, error: null });
          }
        })
        .catch((cause: unknown) => {
          if (active) {
            setResult({
              key,
              src: null,
              isLoading: false,
              error:
                cause instanceof Error
                  ? cause.message
                  : "No se pudo consultar la biblioteca local de imágenes.",
            });
          }
        })
    };

    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string }>).detail;
      if (detail?.key !== key) return;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = null;
      setResult({ key, src: null, isLoading: true, error: null });
      load();
    };

    window.addEventListener(IMAGE_UPDATED_EVENT, handleUpdate);
    load();
    return () => {
      active = false;
      window.removeEventListener(IMAGE_UPDATED_EVENT, handleUpdate);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [key]);

  const isCurrentResult = result.key === key;
  const localSrc = isCurrentResult ? result.src : null;
  return {
    src: localSrc ?? staticFallbackUrl ?? null,
    isLoading: !isCurrentResult || result.isLoading,
    hasLocalImage: localSrc !== null,
    error: isCurrentResult ? result.error : null,
  };
}
