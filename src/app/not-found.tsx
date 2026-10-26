import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center bg-ground px-6 py-16">
      <div className="max-w-md w-full rounded-xl border border-border bg-surface p-8 text-center space-y-4">
        <p className="text-xs font-medium text-muted num-tabular">404</p>
        <h1 className="font-serif text-3xl text-ink">
          No encontramos esta página
        </h1>
        <p className="text-sm text-muted leading-relaxed">
          Es posible que el registro haya sido eliminado o que el enlace pertenezca a otro espacio de trabajo.
        </p>
        <div className="pt-2">
          <Button asChild variant="primary">
            <Link href="/">
              <ArrowLeft className="size-4" aria-hidden="true" />
              <span>Volver al inicio</span>
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
