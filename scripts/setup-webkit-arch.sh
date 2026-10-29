#!/usr/bin/env bash
# WebKit de Playwright en Arch Linux sin sudo.
#
# El bundle de WebKit está compilado para Ubuntu 24.04 y enlaza contra
# bibliotecas con SONAME fijo (libicu*.so.74, libxml2.so.2, etc.). Arch trae
# versiones más nuevas (ICU 78, libxml2.so.16), así que el navegador no arranca.
# Este script descarga los .deb de Ubuntu, extrae solo las bibliotecas y las
# enlaza en el directorio `sys/lib` que el wrapper de Playwright ya busca.
#
# Uso:  bash scripts/setup-webkit-arch.sh
#       npx playwright install webkit   # si todavía no está descargado
#
# No requiere root. Es idempotente.

set -euo pipefail

CACHE_DIR="${PLAYWRIGHT_WEBKIT_LIBS:-$HOME/.cache/playwright-webkit-libs}"
DEB_DIR="$CACHE_DIR/debs"
ARCHIVE="http://archive.ubuntu.com/ubuntu"

PACKAGES=(
  "pool/main/i/icu/libicu74_74.2-1ubuntu3.1_amd64.deb"
  "pool/main/libx/libxml2/libxml2_2.9.14+dfsg-1.3ubuntu3.10_amd64.deb"
  "pool/universe/f/flite/libflite1_2.2-6build3_amd64.deb"
  "pool/main/e/enchant-2/libenchant-2-2_2.3.3-2build2_amd64.deb"
  "pool/main/libm/libmanette/libmanette-0.2-0_0.2.7-1build2_amd64.deb"
  "pool/universe/j/jpeg-xl/libjxl0.7_0.7.0-10.2ubuntu6.1_amd64.deb"
  "pool/universe/libb/libbacktrace/libbacktrace0_0.1-4build1_amd64.deb"
)

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "Este script es solo para Linux." >&2
  exit 1
fi

mkdir -p "$CACHE_DIR" "$DEB_DIR"

for package in "${PACKAGES[@]}"; do
  file="$DEB_DIR/$(basename "$package")"
  if [[ ! -f "$file" ]]; then
    echo "Descargando $(basename "$package")…"
    curl -fsSL --retry 3 -o "$file" "$ARCHIVE/$package"
  fi

  tmp="$(mktemp -d)"
  (cd "$tmp" && ar x "$file" && tar --zstd -xf data.tar.zst 2>/dev/null || tar -xf data.tar.*)
  find "$tmp/usr/lib" \( -type f -o -type l \) -name "*.so*" -exec cp -a {} "$CACHE_DIR/" \;
  rm -rf "$tmp"
done

# WebKit 27 pide libjxl.so.0.8; Ubuntu 24.04 solo publica 0.7 con el mismo
# nodo de versión JXL_0. Un symlink alcanza para resolver el SONAME.
cd "$CACHE_DIR"
[[ -e libjxl.so.0.8 ]] || ln -s libjxl.so.0.7 libjxl.so.0.8

WEBKIT_DIR="$(ls -d "$HOME"/.cache/ms-playwright/webkit-* 2>/dev/null | sort -V | tail -1 || true)"
if [[ -z "$WEBKIT_DIR" ]]; then
  echo "No se encontró WebKit en ~/.cache/ms-playwright. Ejecuta primero:" >&2
  echo "  npx playwright install webkit" >&2
  exit 1
fi

for variant in minibrowser-wpe minibrowser-gtk; do
  target="$WEBKIT_DIR/$variant/sys/lib"
  [[ -d "$target" ]] || continue
  for lib in "$CACHE_DIR"/lib*.so*; do
    base="$(basename "$lib")"
    [[ -e "$target/$base" ]] || ln -s "$lib" "$target/$base"
  done
  echo "Bibliotecas enlazadas en $target"
done

echo "Listo. Playwright salteará la validación de dependencias al detectar $CACHE_DIR."
