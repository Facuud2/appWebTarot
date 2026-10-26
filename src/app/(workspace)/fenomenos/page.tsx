import type { Metadata } from "next";
import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhenomenaObservatoryClient } from "@/features/readings/phenomena-observatory-client";
import { listCanonicalCards } from "@/repositories/grimorio-repository";
import { listDeckEventsWithContext } from "@/repositories/readings-repository";
import { listUserTags } from "@/repositories/tags-repository";
import { requireUser } from "@/server/session";

export const metadata: Metadata = {
  title: "Eventos del mazo",
};

export default async function PhenomenaObservatoryPage() {
  const user = await requireUser();
  const events = listDeckEventsWithContext(user.id);
  const cards = listCanonicalCards();
  const tags = listUserTags(user.id);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-serif text-3xl text-ink">
            Eventos del mazo
          </h1>
          <p className="text-sm text-muted">
            Historial de cartas que saltaron al mezclar, cayeron, quedaron en la base o salieron en el corte.
          </p>
        </div>

        <Button asChild variant="secondary">
          <Link href="/lecturas/nueva">
            <FilePlus2 className="size-4" aria-hidden="true" />
            <span>Nueva lectura</span>
          </Link>
        </Button>
      </header>

      <PhenomenaObservatoryClient events={events} cards={cards} tags={tags} />
    </div>
  );
}
