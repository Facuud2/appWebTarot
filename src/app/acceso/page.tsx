import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthPanel } from "@/features/auth/auth-panel";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default async function AccesoPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  return (
    <div className="min-h-dvh bg-ground px-4 py-10 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="w-full max-w-4xl grid gap-10 lg:grid-cols-[1fr_1.15fr] items-start">
        <section className="space-y-5 pt-2">
          <div className="flex items-center gap-3">
            <svg
              viewBox="0 0 28 28"
              fill="none"
              className="size-7 shrink-0"
              aria-hidden="true"
            >
              <rect
                x="4"
                y="2.5"
                width="20"
                height="23"
                rx="3"
                className="stroke-ink"
                strokeWidth="1.7"
              />
              <circle
                cx="14"
                cy="14"
                r="4.5"
                className="stroke-accent"
                strokeWidth="1.7"
              />
            </svg>
            <span className="font-serif text-2xl text-ink">Mesa de Tarot</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl leading-tight text-ink">
            Agenda, registro de lecturas y catálogo de cartas para tarotistas.
          </h1>

          <p className="text-base text-muted leading-relaxed">
            Organiza tus sesiones y consultantes, registra las cartas que salieron con tus mazos reales y conserva tus propios significados de forma clara y ordenada.
          </p>

          <dl className="space-y-3 border-t border-border pt-5 text-sm">
            <div>
              <dt className="font-medium text-ink">Registro claro de cada sesión</dt>
              <dd className="text-muted">
                Separa qué cartas salieron, el contexto de la consulta y tus notas personales.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-ink">
                Eventos del mazo
              </dt>
              <dd className="text-muted">
                Anota fácilmente cartas que saltan al mezclar, caen, quedan en la base o salen en el corte.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-ink">
                Resguardo privado y sincronización
              </dt>
              <dd className="text-muted">
                Datos privados por cuenta con copia de seguridad y restauración en JSON.
              </dd>
            </div>
          </dl>
        </section>

        <section aria-label="Formulario de acceso">
          <AuthPanel />
        </section>
      </div>
    </div>
  );
}
