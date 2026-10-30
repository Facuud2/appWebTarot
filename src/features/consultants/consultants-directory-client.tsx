"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, FilePlus2, Search, UserPlus, X } from "lucide-react";
import { ConsultantAvatar } from "@/components/shared/consultant-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConsultantFormDialog } from "@/features/consultants/consultant-form-dialog";
import { formatDateShortEs } from "@/lib/utils";
import type { Consultant } from "@/types/domain";

interface ConsultantsDirectoryClientProps {
  consultants: Consultant[];
  allTags: string[];
  initialQuery: string;
  initialTag: string;
  showingArchived: boolean;
  openCreateInitially: boolean;
}

const PENDING_SETUP_TAG = "Pendiente de datos";

export function ConsultantsDirectoryClient({
  consultants,
  allTags,
  initialQuery,
  initialTag,
  showingArchived,
  openCreateInitially,
}: ConsultantsDirectoryClientProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = React.useState(openCreateInitially);
  const [searchInput, setSearchInput] = React.useState(initialQuery);
  const thematicTags = allTags.filter(
    (tag) => tag.toLowerCase() !== PENDING_SETUP_TAG.toLowerCase()
  );
  const showSetupStatusFilter =
    allTags.some(
      (tag) => tag.toLowerCase() === PENDING_SETUP_TAG.toLowerCase()
    ) ||
    initialTag.toLowerCase() === PENDING_SETUP_TAG.toLowerCase();

  const applyFilter = (params: {
    q?: string;
    tag?: string;
    archived?: boolean;
  }) => {
    const sp = new URLSearchParams();
    const nextQ = params.q !== undefined ? params.q : searchInput;
    const nextTag = params.tag !== undefined ? params.tag : initialTag;
    const nextArch =
      params.archived !== undefined ? params.archived : showingArchived;

    if (nextQ.trim()) sp.set("q", nextQ.trim());
    if (nextTag.trim()) sp.set("tag", nextTag.trim());
    if (nextArch) sp.set("archivados", "1");

    const qs = sp.toString();
    router.push(qs ? `/consultantes?${qs}` : "/consultantes");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-serif text-3xl text-ink">Consultantes</h1>
          <p className="text-sm text-muted">
            Fichas personales, contexto de acompañamiento e historial de lecturas en mesa.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={() => setCreateOpen(true)}
        >
          <UserPlus className="size-4" aria-hidden="true" />
          <span>Nuevo consultante</span>
        </Button>
      </header>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-surface p-3.5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyFilter({ q: searchInput });
          }}
          className="flex min-w-0 flex-1 flex-wrap sm:flex-nowrap items-center gap-2"
        >
          <div className="relative min-w-[160px] flex-1 max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por nombre, alias o notas…"
              aria-label="Buscar consultantes"
              autoCapitalize="none"
              className="pl-9 h-9"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary" className="h-9">
            Filtrar
          </Button>
          {(initialQuery || initialTag) ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-9"
              onClick={() => {
                setSearchInput("");
                applyFilter({ q: "", tag: "" });
              }}
            >
              <X className="size-3.5" aria-hidden="true" />
              <span>Limpiar</span>
            </Button>
          ) : null}
        </form>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => applyFilter({ archived: false })}
            aria-pressed={!showingArchived}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-[color,background-color,border-color,transform] duration-150 active:scale-95 ${
              !showingArchived
                ? "bg-ground text-ink border border-border shadow-xs"
                : "text-muted hover:text-ink"
            }`}
          >
            Activos
          </button>
          <button
            type="button"
            onClick={() => applyFilter({ archived: true })}
            aria-pressed={showingArchived}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-[color,background-color,border-color,transform] duration-150 active:scale-95 ${
              showingArchived
                ? "bg-ground text-ink border border-border shadow-xs"
                : "text-muted hover:text-ink"
            }`}
          >
            <Archive className="size-3.5" aria-hidden="true" />
            <span>Archivados</span>
          </button>
        </div>
      </div>

      {(showSetupStatusFilter || thematicTags.length > 0) ? (
        <div className="space-y-2">
          {showSetupStatusFilter ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted mr-1">Estado de ficha:</span>
              <button
                type="button"
                onClick={() =>
                  applyFilter({
                    tag:
                      initialTag.toLowerCase() === PENDING_SETUP_TAG.toLowerCase()
                        ? ""
                        : PENDING_SETUP_TAG,
                  })
                }
                aria-pressed={
                  initialTag.toLowerCase() === PENDING_SETUP_TAG.toLowerCase()
                }
                className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                  initialTag.toLowerCase() === PENDING_SETUP_TAG.toLowerCase()
                    ? "bg-primary text-on-primary font-medium"
                    : "border border-border bg-ground text-muted hover:text-ink"
                }`}
              >
                Pendiente de datos
              </button>
            </div>
          ) : null}
          {thematicTags.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted mr-1">Etiquetas temáticas:</span>
              {thematicTags.map((tag) => {
                const active = initialTag.toLowerCase() === tag.toLowerCase();
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => applyFilter({ tag: active ? "" : tag })}
                    aria-pressed={active}
                    className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                      active
                        ? "bg-primary text-on-primary font-medium"
                        : "border border-border bg-ground text-muted hover:text-ink"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Consultants Table / Responsive Two-line List */}
      {consultants.length === 0 ? (
        <div className="rounded-xl border border-border bg-ground p-10 text-center space-y-3">
          <p className="text-base font-semibold text-ink">
            {showingArchived
              ? "No tienes consultantes archivados"
              : initialQuery || initialTag
                ? "Ningún consultante coincide con el filtro actual"
                : "Registra tu primer consultante"}
          </p>
          <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
            {showingArchived
              ? "Cuando archives una ficha para no mostrarla en la lista activa, la verás aquí."
              : "Puedes registrar una persona con su nombre o un simple alias para organizar sus lecturas y citas con total privacidad."}
          </p>
          {!showingArchived ? (
            <div className="pt-2">
              <Button
                type="button"
                size="sm"
                variant="primary"
                onClick={() => setCreateOpen(true)}
              >
                <UserPlus className="size-3.5" aria-hidden="true" />
                <span>Registrar consultante</span>
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-ground overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between text-xs text-muted">
            <span className="num-tabular">
              {consultants.length}{" "}
              {consultants.length === 1 ? "ficha mostrada" : "fichas mostradas"}
            </span>
            <span className="hidden sm:inline">
              Selecciona un nombre para abrir su expediente completo
            </span>
          </div>

          <div className="divide-y divide-rule">
            {consultants.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-surface/60 transition-colors duration-150"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <ConsultantAvatar
                    name={c.displayName}
                    hue={c.avatarHue}
                    size="md"
                  />
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/consultantes/${c.id}`}
                        className="text-sm font-medium text-ink hover:text-accent"
                      >
                        {c.displayName}
                      </Link>
                      {c.alias && c.alias !== c.fullName ? (
                        <span className="text-xs text-muted">
                          ({c.fullName})
                        </span>
                      ) : null}
                      {c.upcomingAppointmentsCount > 0 ? (
                        <Badge variant="positive" className="num-tabular">
                          {c.upcomingAppointmentsCount} cita próxima
                        </Badge>
                      ) : null}
                    </div>

                    {c.contextNotes ? (
                      <p className="text-xs text-muted line-clamp-1 max-w-xl">
                        {c.contextNotes}
                      </p>
                    ) : null}

                    {c.tags.some(
                      (tag) =>
                        tag.name.toLowerCase() !== PENDING_SETUP_TAG.toLowerCase()
                    ) ? (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {c.tags
                          .filter(
                            (tag) =>
                              tag.name.toLowerCase() !==
                              PENDING_SETUP_TAG.toLowerCase()
                          )
                          .map((t) => (
                          <Badge key={t.id} variant="neutral">
                            {t.name}
                          </Badge>
                          ))}
                      </div>
                    ) : null}
                    {c.needsSetup ? (
                      <Badge variant="warning">Pendiente de datos</Badge>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-5 pl-12 sm:pl-0 shrink-0">
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-normal text-ink num-tabular">
                      {c.readingsCount}{" "}
                      <span className="text-xs text-muted">
                        {c.readingsCount === 1 ? "lectura" : "lecturas"}
                      </span>
                    </p>
                    <p className="text-xs text-muted num-tabular">
                      {c.lastReadingAt
                        ? `Última: ${formatDateShortEs(c.lastReadingAt)}`
                        : "Sin lecturas aún"}
                    </p>
                  </div>

                  <Button asChild size="sm" variant="secondary">
                    <Link
                      href={`/lecturas/nueva?consultantId=${encodeURIComponent(c.id)}`}
                    >
                      <FilePlus2 className="size-3.5" aria-hidden="true" />
                      <span>Nueva lectura</span>
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConsultantFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        tagSuggestions={allTags}
      />
    </div>
  );
}
