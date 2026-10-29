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
import { shouldIgnoreUnsavedPopstate } from "@/hooks/use-mobile-back-close";
import { setPopstateGuard } from "@/lib/popstate-guard";
import { Bookmark, AlertTriangle } from "lucide-react";

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
  //
  // The guard listener is registered once, at module evaluation time, so it runs
  // before the App Router's own popstate listener and can veto the traversal.
  // See `src/lib/popstate-guard.ts` for why registration order matters here.
  const guardedHrefRef = React.useRef("");
  const guardedStateRef = React.useRef<unknown>(null);
  const dirtyRef = React.useRef(false);
  const dialogOpenRef = React.useRef(false);

  // Keep the refs in sync synchronously: an update followed by `router.back()`
  // (discard and leave) must not be blocked by a stale `isDirty`.
  const updateDirty = React.useCallback((dirty: boolean) => {
    if (dirty && !dirtyRef.current) {
      // Freeze the exact guarded URL and history entry at the moment the form
      // becomes dirty, before any traversal can occur.
      guardedHrefRef.current = window.location.href;
      guardedStateRef.current = window.history.state;
    }
    dirtyRef.current = dirty;
    setIsDirty(dirty);
  }, []);

  const updateDialogOpen = React.useCallback((open: boolean) => {
    dialogOpenRef.current = open;
    setShowConfirmDialog(open);
    if (!open) setPendingHref(null);
  }, []);

  React.useEffect(() => {
    return setPopstateGuard(() => {
      // Overlays (modals, sheets, comboboxes) have priority: they already own
      // this history entry and will close themselves.
      if (shouldIgnoreUnsavedPopstate()) return false;
      if (!dirtyRef.current) return false;

      // The browser already moved to the destination entry by the time
      // popstate fires: restore the guarded entry before anything else.
      window.history.pushState(
        guardedStateRef.current,
        "",
        guardedHrefRef.current || window.location.href
      );

      if (dialogOpenRef.current) {
        // Back while the prompt is open behaves like "Cancelar".
        updateDialogOpen(false);
      } else {
        setPendingHref("BACK");
        updateDialogOpen(true);
      }

      return true;
    });
  }, [updateDialogOpen]);

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
      updateDialogOpen(true);
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [isDirty, updateDialogOpen]);

  const executeNavigation = (destination: string | null) => {
    if (!destination) return;
    if (destination === "BACK") {
      router.back();
    } else {
      router.push(destination);
    }
  };

  const handleCancel = () => {
    updateDialogOpen(false);
  };

  const handleDiscardAndLeave = () => {
    const dest = pendingHref;
    updateDirty(false);
    updateDialogOpen(false);
    executeNavigation(dest);
  };

  const handleSaveDraftAndLeave = async () => {
    if (saveDraftHandlerRef.current) {
      setIsSavingDraft(true);
      try {
        const ok = await saveDraftHandlerRef.current();
        if (ok) {
          const dest = pendingHref;
          updateDirty(false);
          updateDialogOpen(false);
          executeNavigation(dest);
        }
      } catch (err) {
        console.error("Error saving draft before navigation:", err);
      } finally {
        setIsSavingDraft(false);
      }
    } else {
      // If no draft handler is registered, simply navigate
      const dest = pendingHref;
      updateDirty(false);
      updateDialogOpen(false);
      executeNavigation(dest);
    }
  };

  return (
    <UnsavedChangesContext.Provider
      value={{
        isDirty,
        setIsDirty: updateDirty,
        registerSaveDraftHandler,
      }}
    >
      {children}

      <AlertDialog
        open={showConfirmDialog}
        mobileBackClose={false}
        onOpenChange={(open) => {
          updateDialogOpen(open);
        }}
      >
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
