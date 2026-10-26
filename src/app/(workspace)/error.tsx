"use client";

import { Button } from "@/components/ui/button";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-negative/30 bg-surface p-6 space-y-3"
    >
      <h2 className="text-base font-semibold text-ink">
        No se pudo cargar esta sección
      </h2>
      <p className="text-sm text-muted">
        {error.message ||
          "Ocurrió una interrupción al leer la base de datos. Tus registros previos permanecen resguardados."}
      </p>
      <div>
        <Button type="button" variant="secondary" onClick={reset}>
          Reintentar carga
        </Button>
      </div>
    </div>
  );
}
