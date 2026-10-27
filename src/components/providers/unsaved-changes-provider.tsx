"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Bookmark, AlertTriangle, ArrowRight } from "lucide-react";

interface UnsavedChangesContextValue {
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  registerSaveDraftHandler: (handler: (() => Promise<boolean>) | null) => void;
}

const UnsavedChangesContext =
  React.createContext<UnsavedChangesContextValue | null>(null);

export function useUnsavedChanges() {
  const ctx = React.useContext(UnsavedChangesContext);
  if (!ctx) {
    return {
      isDirty: false,
      setIsDirty: () => {},
      registerSaveDraftHandler: () => {},
    };
  }
  return ctx;
}

export function UnsavedChangesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isDirty, setIsDirty] = React.useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = React.useState(false);

  const saveDraftHandlerRef = React.useRef<(() => Promise<boolean>) | null>(null);

  const registerSaveDraftHandler = React.useCallback(
    (handler: (() => Promise<boolean>) | null) => {
      saveDraftHandlerRef.current = handler;
    },
    []
  );

  // 1. Intercept browser reload / tab close
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  // 2. Intercept popstate (browser back/forward)
  React.useEffect(() => {
    const handlePopState = () => {
      if (isDirty) {
        // Push state back so url doesn't change immediately
        window.history.pushState(null, "", window.location.href);
        setPendingHref("BACK");
        setShowConfirmDialog(true);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isDirty]);

  // 3. Intercept link clicks across the entire app shell (bottom bar, sidebar, headers, etc.)
  React.useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (!isDirty) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const anchor = target.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;

      const rawHref = anchor.getAttribute("href");
      if (!rawHref) return;

      // Ignore in-page anchors, external links, javascript:, mailto:, tel:, target _blank
      if (
        rawHref.startsWith("#") ||
        rawHref.startsWith("javascript:") ||
        rawHref.startsWith("mailto:") ||
        rawHref.startsWith("tel:") ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }

      // Check if it's the exact same page
      try {
        const targetUrl = new URL(anchor.href, window.location.origin);
        if (
          targetUrl.pathname === window.location.pathname &&
          targetUrl.search === window.location.search
        ) {
          return;
        }
      } catch {
        // fallback
      }

      // Intercept navigation
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(rawHref);
      setShowConfirmDialog(true);
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [isDirty]);

  const executeNavigation = (destination: string | null) => {
    if (!destination) return;
    if (destination === "BACK") {
      router.back();
    } else {
      router.push(destination);
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    setPendingHref(null);
  };

  const handleDiscardAndLeave = () => {
    setIsDirty(false);
    setShowConfirmDialog(false);
    const dest = pendingHref;
    setPendingHref(null);
    executeNavigation(dest);
  };

  const handleSaveDraftAndLeave = async () => {
    if (saveDraftHandlerRef.current) {
      setIsSavingDraft(true);
      try {
        const ok = await saveDraftHandlerRef.current();
        if (ok) {
          setIsDirty(false);
          setShowConfirmDialog(false);
          const dest = pendingHref;
          setPendingHref(null);
          executeNavigation(dest);
        }
      } catch (err) {
        console.error("Error saving draft before navigation:", err);
      } finally {
        setIsSavingDraft(false);
      }
    } else {
      // If no draft handler is registered, simply navigate
      setIsDirty(false);
      setShowConfirmDialog(false);
      const dest = pendingHref;
      setPendingHref(null);
      executeNavigation(dest);
    }
  };

  return (
    <UnsavedChangesContext.Provider
      value={{
        isDirty,
        setIsDirty,
        registerSaveDraftHandler,
      }}
    >
      {children}

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-md p-6">
          <AlertDialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-5" />
              </div>
              <div className="min-w-0">
                <AlertDialogTitle className="font-serif text-lg font-semibold text-ink leading-snug">
                  ¿Deseas salir de la lectura?
                </AlertDialogTitle>
                <p className="text-xs text-muted">Sesión en progreso sin finalizar</p>
              </div>
            </div>
            <AlertDialogDescription className="text-sm text-ink/80 pt-1 leading-relaxed">
              Tienes una lectura en curso. Si sales a otra sección sin guardar en borrador,
              se perderán las cartas, notas y posiciones ingresadas en esta sesión.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-5 flex flex-col gap-2.5">
            <Button
              type="button"
              variant="primary"
              onClick={handleSaveDraftAndLeave}
              disabled={isSavingDraft}
              className="w-full flex items-center justify-center gap-2 h-10"
            >
              <Bookmark className="size-4" />
              <span>
                {isSavingDraft ? "Guardando borrador..." : "Guardar en borrador y salir"}
              </span>
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancel}
                disabled={isSavingDraft}
                className="w-full border border-border h-9.5 text-ink hover:bg-surface"
              >
                Cancelar
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={handleDiscardAndLeave}
                disabled={isSavingDraft}
                className="w-full h-9.5"
              >
                Salir sin guardar
              </Button>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </UnsavedChangesContext.Provider>
  );
}
