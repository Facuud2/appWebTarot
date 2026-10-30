"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  BookOpen,
  Calendar,
  FilePlus2,
  ScrollText,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GlobalSearchResult } from "@/types/domain";

interface GlobalCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalCommandPalette({
  open,
  onOpenChange,
}: GlobalCommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<GlobalSearchResult | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  React.useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}`
        );
        if (res.ok && active) {
          const data = (await res.json()) as GlobalSearchResult;
          setResults(data);
        }
      } catch {
        // Keep previous results silently if offline
      } finally {
        if (active) setLoading(false);
      }
    }, 140);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, query]);

  const navigate = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden gap-0">
        <DialogTitle className="sr-only">
          Búsqueda global
        </DialogTitle>
        <DialogDescription className="sr-only">
          Busca lecturas, consultantes, cartas o ejecuta acciones rápidas.
        </DialogDescription>

        <Command shouldFilter={false} className="flex flex-col">
          <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
            <Search className="size-4 text-muted shrink-0" aria-hidden="true" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Buscar lecturas, consultantes, cartas o acciones…"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="none"
              className="w-full bg-transparent text-sm text-ink placeholder:text-faint outline-none pr-8"
            />
          </div>

          <Command.List className="max-h-[380px] overflow-y-auto p-2">
            {loading && !results ? (
              <div className="px-3 py-6 text-center text-xs text-muted">
                Buscando…
              </div>
            ) : null}

            <Command.Group
              heading="Acciones rápidas"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted"
            >
              <Command.Item
                value="nueva-lectura"
                onSelect={() => navigate("/lecturas/nueva")}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink data-[selected=true]:bg-active"
              >
                <FilePlus2 className="size-4 text-muted" aria-hidden="true" />
                <span>Iniciar nueva lectura</span>
              </Command.Item>
              <Command.Item
                value="ir-agenda"
                onSelect={() => navigate("/agenda")}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink data-[selected=true]:bg-active"
              >
                <Calendar className="size-4 text-muted" aria-hidden="true" />
                <span>Abrir agenda de sesiones</span>
              </Command.Item>
              <Command.Item
                value="ir-fenomenos"
                onSelect={() => navigate("/fenomenos")}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink data-[selected=true]:bg-active"
              >
                <Sparkles className="size-4 text-muted" aria-hidden="true" />
                <span>Ver eventos del mazo</span>
              </Command.Item>
            </Command.Group>

            {results && results.readings.length > 0 ? (
              <Command.Group
                heading="Lecturas"
                className="mt-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted"
              >
                {results.readings.map((r) => (
                  <Command.Item
                    key={r.id}
                    value={`reading-${r.id}`}
                    onSelect={() => navigate(`/lecturas/${r.id}`)}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm text-ink data-[selected=true]:bg-active"
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <ScrollText
                        className="size-4 shrink-0 text-muted"
                        aria-hidden="true"
                      />
                      <span className="truncate">{r.title}</span>
                    </span>
                    <span className="text-xs text-muted shrink-0">
                      {r.consultantName ?? "Lectura personal"}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            {results && results.consultants.length > 0 ? (
              <Command.Group
                heading="Consultantes"
                className="mt-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted"
              >
                {results.consultants.map((c) => (
                  <Command.Item
                    key={c.id}
                    value={`consultant-${c.id}`}
                    onSelect={() => navigate(`/consultantes/${c.id}`)}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm text-ink data-[selected=true]:bg-active"
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <Users
                        className="size-4 shrink-0 text-muted"
                        aria-hidden="true"
                      />
                      <span className="truncate">{c.displayName}</span>
                    </span>
                    <span className="text-xs text-muted shrink-0 num-tabular">
                      {c.subtitle}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            {results && results.cards.length > 0 ? (
              <Command.Group
                heading="Cartas"
                className="mt-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted"
              >
                {results.cards.map((card) => (
                  <Command.Item
                    key={card.id}
                    value={`card-${card.id}`}
                    onSelect={() => navigate(`/grimorio/${card.slug}`)}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm text-ink data-[selected=true]:bg-active"
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <BookOpen
                        className="size-4 shrink-0 text-muted"
                        aria-hidden="true"
                      />
                      <span className="truncate">{card.name}</span>
                    </span>
                    <span className="max-w-[200px] truncate text-xs text-muted">
                      {card.subtitle}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
