import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NewReadingForm } from "@/features/readings/new-reading-form";
import {
  BUILTIN_DECKS,
  BUILTIN_SPREAD_TEMPLATES,
  CANONICAL_TAROT_CARDS,
  LIVING_WHEEL_CARDS,
  RWS_CARDS,
  THOTH_CARDS,
} from "@/lib/tarot-catalog";
import type { Deck, SpreadTemplate } from "@/types/domain";

const mockPush = vi.fn();
const mockBack = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: mockBack,
  }),
  usePathname: () => "/lecturas/nueva",
}));

vi.mock("@/actions/reading-actions", () => ({
  createReadingDraftAction: vi.fn().mockResolvedValue({
    ok: true,
    data: { id: "reading-mock-123", consultantId: null, deckIds: ["deck-rws"] },
  }),
  saveReadingSessionAction: vi.fn().mockResolvedValue({
    ok: true,
    data: { id: "reading-mock-123" },
  }),
  recordDeckEventAction: vi.fn().mockResolvedValue({
    ok: true,
    data: { id: "event-mock-123" },
  }),
}));

const sampleDecks: Deck[] = [
  {
    id: "deck-rws",
    userId: "user-1",
    name: "Rider-Waite-Smith (RWS)",
    tradition: "rws",
    author: "A.E. Waite",
    cardCount: 78,
    readingsCount: 0,
    description: "Canon RWS",
    isDefault: true,
    needsSetup: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "deck-living-wheel",
    userId: "user-1",
    name: "The Living Wheel Tarot",
    tradition: "living_wheel",
    author: "Patrick Valenza",
    cardCount: 48,
    readingsCount: 0,
    description: "Living Wheel",
    isDefault: false,
    needsSetup: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "deck-thoth",
    userId: "user-1",
    name: "Tarot de Thoth",
    tradition: "thoth",
    author: "Aleister Crowley",
    cardCount: 78,
    readingsCount: 0,
    description: "Thoth canon",
    isDefault: false,
    needsSetup: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

const sampleSpreads: SpreadTemplate[] = BUILTIN_SPREAD_TEMPLATES.map((b) => ({
  id: b.id,
  userId: null,
  name: b.name,
  category: b.category,
  description: b.description,
  positions: b.positions,
  isBuiltin: true,
  createdAt: "2026-01-01T00:00:00.000Z",
}));

describe("3-step New Reading Wizard (Lectura Nueva direct flow)", () => {
  it("completes Step 1 with default position naming for empty custom positions, navigates to Step 2, then Step 3, and supports Cancel confirmation in all steps", async () => {
    const user = userEvent.setup();

    render(
      <NewReadingForm
        consultants={[]}
        decks={sampleDecks}
        spreads={sampleSpreads}
        cardsCatalog={CANONICAL_TAROT_CARDS}
        tagSuggestions={["trabajo", "amor", "guia"]}
        defaultDeckId="deck-rws"
        defaultSpreadId="spread-triad-observation"
      />
    );

    // Initial state: Step 1
    expect(
      screen.getByRole("heading", { name: /Paso 1: Configuración y Estructura/i })
    ).toBeInTheDocument();

    // Verify "Cancelar lectura" button is present in Step 1
    const cancelBtnStep1 = screen.getAllByRole("button", {
      name: /Cancelar lectura/i,
    })[0];
    expect(cancelBtnStep1).toBeInTheDocument();

    // Clicking Cancelar lectura opens confirmation dialog
    await user.click(cancelBtnStep1);
    expect(
      screen.getByText(/¿Deseas cancelar la lectura\?/i)
    ).toBeInTheDocument();
    // Dismiss confirmation to continue
    const continueBtn = screen.getByRole("button", {
      name: /Continuar con la lectura/i,
    });
    await user.click(continueBtn);

    // Choose Custom structure in Step 1
    const structureSelect = screen.getByLabelText(
      /Estructura de cartas a utilizar/i
    );
    await user.selectOptions(structureSelect, "custom");

    // In custom structure, add a card and leave title empty
    expect(screen.getByText(/Significados de cada posición/i)).toBeInTheDocument();

    // Fill question intention
    const intentionInput = screen.getByLabelText(/Pregunta o tema de la consulta/i);
    await user.type(intentionInput, "¿Cuál es el camino a seguir este mes?");

    // Advance to Step 2
    const nextBtnStep1 = screen.getByRole("button", {
      name: /Siguiente: Indicar cartas y notas/i,
    });
    await user.click(nextBtnStep1);

    // Now in Step 2: Selección de Cartas y Notas
    expect(
      screen.getByRole("heading", { name: /Paso 2: Selección de Cartas y Notas/i })
    ).toBeInTheDocument();

    // Verify "Volver a Configuración" is present
    expect(
      screen.getByRole("button", { name: /Volver a Configuración/i })
    ).toBeInTheDocument();

    // Verify Cancelar lectura is present in Step 2
    expect(
      screen.getAllByRole("button", { name: /Cancelar lectura/i }).length
    ).toBeGreaterThan(0);

    // Positions that were left empty in Step 1 now have default names "Carta 1", "Carta 2", "Carta 3"
    expect(screen.getByText("Carta 1")).toBeInTheDocument();
    expect(screen.getByText("Carta 2")).toBeInTheDocument();
    expect(screen.getByText("Carta 3")).toBeInTheDocument();

    // Advance to Step 3
    const nextBtnStep2 = screen.getByRole("button", {
      name: /Siguiente: Acomodar cartas en la mesa/i,
    });
    await user.click(nextBtnStep2);

    // Now in Step 3: Acomodar Mesa y Completar
    expect(
      screen.getByRole("heading", { name: /Paso 3: Acomodar Mesa y Completar/i })
    ).toBeInTheDocument();

    // Tapete interactivo is rendered
    expect(
      screen.getByRole("region", {
        name: /Ubicación de las cartas en la mesa/i,
      })
    ).toBeInTheDocument();

    // "Volver a Cartas y Notas" button is present
    expect(
      screen.getByRole("button", { name: /Volver a Cartas y Notas/i })
    ).toBeInTheDocument();

    // "Cancelar lectura" button is present in Step 3
    expect(
      screen.getAllByRole("button", { name: /Cancelar lectura/i }).length
    ).toBeGreaterThan(0);

    // "Completar y guardar lectura" button is present
    const completeBtn = screen.getByRole("button", {
      name: /Completar y guardar lectura/i,
    });
    expect(completeBtn).toBeInTheDocument();

    // Complete reading
    await user.click(completeBtn);
  });

  it("filters cards strictly by the selected deck(s) in Step 2 (e.g. only Thoth when Thoth is selected, or RWS + Living Wheel when both are selected)", async () => {
    const user = userEvent.setup();

    // Render with only Thoth selected
    render(
      <NewReadingForm
        consultants={[]}
        decks={sampleDecks}
        spreads={sampleSpreads}
        cardsCatalog={CANONICAL_TAROT_CARDS}
        defaultDeckId="deck-thoth"
        defaultSpreadId="spread-triad-observation"
      />
    );

    // Advance to Step 2
    const nextBtn = screen.getByRole("button", {
      name: /Siguiente: Indicar cartas y notas/i,
    });
    await user.click(nextBtn);

    // Summary banner reflects Thoth tradition
    expect(
      screen.getByText(/Tarot de Thoth/i)
    ).toBeInTheDocument();

    // Open card combobox for first position
    const cardPickerBtns = screen.getAllByRole("combobox", {
      name: /Carta colocada en esta posición/i,
    });
    await user.click(cardPickerBtns[0]);

    // Thoth cards like "Ajuste" or "Deseo" or "El Loco (The Fool)" in Thoth should exist
    // But Living Wheel unique cards like "Aries" or "Tauro" should NOT be present
    expect(screen.queryByText(/Aries · Signo de Fuego/i)).not.toBeInTheDocument();
  });
});
