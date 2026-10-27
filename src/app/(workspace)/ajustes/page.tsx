import type { Metadata } from "next";
import { SettingsClient } from "@/features/settings/settings-client";
import {
  listAvailableDecks,
  listSpreadTemplates,
} from "@/repositories/grimorio-repository";
import { requireUser } from "@/server/session";

export const metadata: Metadata = {
  title: "Ajustes y respaldos",
};

export default async function SettingsPage() {
  const user = await requireUser();
  const decks = listAvailableDecks(user.id);
  const spreads = listSpreadTemplates(user.id);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-serif text-3xl text-ink">Ajustes y respaldos</h1>
        <p className="text-sm text-muted">
          Preferencias de tu espacio de trabajo, apariencia visual y copias de seguridad.
        </p>
      </header>

      <SettingsClient user={user} decks={decks} spreads={spreads} />
    </div>
  );
}
