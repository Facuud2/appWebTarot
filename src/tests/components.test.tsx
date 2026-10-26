import * as React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/layout/app-shell";
import { AppProviders } from "@/components/providers/app-providers";
import { SpreadMap, buildSpreadSlots } from "@/components/shared/spread-map";
import { TarotCardPlate } from "@/components/shared/tarot-card-plate";
import { TagInput } from "@/components/ui/tag-input";
import { AppointmentFormDialog } from "@/features/agenda/appointment-form-dialog";
import { DECK_TRADITION_LABELS } from "@/lib/constants";
import {
  BUILTIN_SPREAD_TEMPLATES,
  CANONICAL_TAROT_CARDS,
  LENORMAND_CARDS,
  LIVING_WHEEL_CARDS,
  MARSEILLE_CARDS,
  RWS_CARDS,
  THOTH_CARDS,
} from "@/lib/tarot-catalog";
import {
  appointmentFormSchema,
  consultantFormSchema,
  deckEventFormSchema,
} from "@/schemas/domain";
import type { Consultant, User } from "@/types/domain";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/",
}));

describe("Tarot 78-card catalog, 4 classic spreads, common decks & validation schemas", () => {
  it("contains all 78 unique cards, strictly 4 classic spreads, and common Tarot decks ending in Otra tradición", () => {
    expect(RWS_CARDS).toHaveLength(78);
    expect(MARSEILLE_CARDS).toHaveLength(78);
    expect(THOTH_CARDS).toHaveLength(78);
    expect(LENORMAND_CARDS).toHaveLength(36);
    expect(LIVING_WHEEL_CARDS).toHaveLength(48);
    expect(CANONICAL_TAROT_CARDS).toHaveLength(318);

    const ids = new Set(CANONICAL_TAROT_CARDS.map((c) => c.id));
    const slugs = new Set(CANONICAL_TAROT_CARDS.map((c) => c.slug));
    expect(ids.size).toBe(318);
    expect(slugs.size).toBe(318);

    const majors = RWS_CARDS.filter((c) => c.arcana === "major");
    const wands = RWS_CARDS.filter((c) => c.suit === "wands");
    const cups = RWS_CARDS.filter((c) => c.suit === "cups");
    const swords = RWS_CARDS.filter((c) => c.suit === "swords");
    const pentacles = RWS_CARDS.filter((c) => c.suit === "pentacles");

    expect(majors).toHaveLength(22);
    expect(wands).toHaveLength(14);
    expect(cups).toHaveLength(14);
    expect(swords).toHaveLength(14);
    expect(pentacles).toHaveLength(14);

    // Bilingual English card indexing verification
    const findByEnglish = (query: string) => {
      const q = query.toLowerCase();
      return CANONICAL_TAROT_CARDS.find((c) => {
        const haystack = [
          c.canonicalName,
          c.nameEn,
          ...(c.searchKeywords ?? []),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    };

    expect(findByEnglish("The Fool")?.canonicalName).toBe("El Loco");
    expect(findByEnglish("King of Cups")?.canonicalName).toBe("Rey de Copas");
    expect(findByEnglish("Knight of Swords")?.canonicalName).toBe("Caballero de Espadas");
    expect(findByEnglish("9 of Pentacles")?.canonicalName).toBe("Nueve de Oros");
    expect(findByEnglish("Adjustment")?.canonicalName).toContain("Ajuste");
    expect(findByEnglish("Lust")?.canonicalName).toContain("Deseo");
    expect(findByEnglish("The Rider")?.canonicalName).toContain("El Jinete");
    expect(findByEnglish("The Ram")?.canonicalName).toContain("Aries");

    // Strictly 4 classic built-in spreads (with 5th "Personalizada" option in reading setup)
    expect(BUILTIN_SPREAD_TEMPLATES).toHaveLength(4);
    expect(BUILTIN_SPREAD_TEMPLATES.map((s) => s.id)).toEqual([
      "spread-triad-observation",
      "spread-simple-cross",
      "spread-horseshoe-7",
      "spread-celtic-cross",
    ]);

    // Common Tarot decks ending with "Otra tradición"
    const traditionEntries = Object.entries(DECK_TRADITION_LABELS);
    expect(traditionEntries.length).toBeGreaterThanOrEqual(10);
    expect(traditionEntries.at(-1)).toEqual(["other", "Otra tradición"]);
  });

  it("supports privacy-first consultant registration with alias alone and validates optional email", () => {
    const aliasOnly = consultantFormSchema.safeParse({
      fullName: "Consultante Nocturna",
      alias: "Norte",
      email: "",
      phone: "",
      preferredChannel: "",
      contextNotes: "",
      personalNotes: "",
      tags: ["Privacidad"],
    });
    expect(aliasOnly.success).toBe(true);

    const invalidEmail = consultantFormSchema.safeParse({
      fullName: "Consultante",
      alias: "",
      email: "correo-invalido",
      phone: "",
      preferredChannel: "",
      contextNotes: "",
      personalNotes: "",
      tags: [],
    });
    expect(invalidEmail.success).toBe(false);
  });

  it("validates optional appointment duration only when hasSpecificDuration is checked", () => {
    const withoutDuration = appointmentFormSchema.safeParse({
      consultantId: "cons-1",
      title: "Sesión general",
      scheduledAt: "2026-11-02T17:00",
      hasSpecificDuration: false,
      durationMinutes: null,
      modality: "video",
      status: "scheduled",
      intention: "",
      prepNotes: "",
    });
    expect(withoutDuration.success).toBe(true);

    const missingDurationWhenChecked = appointmentFormSchema.safeParse({
      consultantId: "cons-1",
      title: "Sesión con tiempo",
      scheduledAt: "2026-11-02T17:00",
      hasSpecificDuration: true,
      durationMinutes: null,
      modality: "video",
      status: "scheduled",
      intention: "",
      prepNotes: "",
    });
    expect(missingDurationWhenChecked.success).toBe(false);
  });

  it("requires physical description on deck events while keeping personal interpretation optional", () => {
    const missingObservation = deckEventFormSchema.safeParse({
      readingId: "read-1",
      cardId: "major-16",
      occurredPhase: "shuffling",
      phenomenonType: "jumped",
      customPhenomenonLabel: "",
      linkedPositionIndex: null,
      observationDescription: "",
      personalInterpretation: "Significado aislado",
      occurredAt: "2026-10-25T12:00",
      tags: [],
    });
    expect(missingObservation.success).toBe(false);

    const validObservationOnly = deckEventFormSchema.safeParse({
      readingId: "read-1",
      cardId: "major-16",
      occurredPhase: "shuffling",
      phenomenonType: "jumped",
      customPhenomenonLabel: "",
      linkedPositionIndex: null,
      observationDescription: "La Torre saltó girada sobre el borde izquierdo.",
      personalInterpretation: "",
      occurredAt: "2026-10-25T12:00",
      tags: ["Mezcla"],
    });
    expect(validObservationOnly.success).toBe(true);
  });
});

describe("Interactive UI components", () => {
  it("renders SpreadMap slots with occupied, reversed, and vacant states and toggles mobile drag mode cleanly", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onMove = vi.fn();
    const triad = BUILTIN_SPREAD_TEMPLATES.find(
      (t) => t.id === "spread-triad-observation"
    );
    const hermit =
      CANONICAL_TAROT_CARDS.find((c) => c.id === "major-09") ?? null;

    const slots = buildSpreadSlots(
      triad?.positions,
      [
        {
          positionIndex: 1,
          positionTitle: "Pasado",
          card: hermit,
          orientation: "reversed",
        },
      ],
      new Set([1])
    );

    expect(slots).toHaveLength(3);

    render(
      <SpreadMap
        slots={slots}
        activePositionIndex={1}
        onSelectPosition={onSelect}
        editable
        onMovePosition={onMove}
      />
    );

    const pos1Btn = screen.getByRole("button", {
      name: /Carta 1: Pasado, El Ermitaño/i,
    });
    expect(pos1Btn).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Invertida")).toBeInTheDocument();

    const pos2Btn = screen.getByRole("button", {
      name: /Carta 2:.*, sin carta/i,
    });
    await user.click(pos2Btn);
    expect(onSelect).toHaveBeenCalledWith(2);

    // Mobile drag toggle keeps scroll safe (touch-pan-y) until explicitly enabled (touch-none)
    const mapRegion = screen.getByRole("region", {
      name: /Ubicación de las cartas en la mesa/i,
    });
    expect(mapRegion).toHaveClass("touch-pan-y");

    const moveBtn = screen.getByRole("button", { name: /Mover cartas/i });
    expect(moveBtn).toHaveAttribute("aria-pressed", "false");

    await user.click(moveBtn);
    expect(
      screen.getByRole("button", { name: /Terminar de mover/i })
    ).toHaveAttribute("aria-pressed", "true");
    expect(mapRegion).toHaveClass("touch-none");
  });

  it("hides appointment duration input by default and reveals it only when checking Duración específica", async () => {
    const user = userEvent.setup();
    const sampleConsultant: Consultant = {
      id: "cons-demo",
      userId: "user-demo",
      fullName: "Marina Vega",
      alias: "Marina",
      displayName: "Marina",
      email: null,
      phone: null,
      preferredChannel: "Videollamada",
      contextNotes: "",
      personalNotes: "",
      avatarHue: 180,
      archivedAt: null,
      createdAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-01T10:00:00.000Z",
      tags: [],
      readingsCount: 0,
      upcomingAppointmentsCount: 0,
      lastReadingAt: null,
      needsSetup: false,
    };

    render(
      <AppointmentFormDialog
        open
        onOpenChange={vi.fn()}
        consultants={[sampleConsultant]}
      />
    );

    expect(
      screen.queryByLabelText(/Duración \(minutos\)/i)
    ).not.toBeInTheDocument();

    const durationCheck = screen.getByRole("checkbox", {
      name: /Duración específica/i,
    });
    await user.click(durationCheck);

    expect(screen.getByLabelText(/Duración \(minutos\)/i)).toBeInTheDocument();

    await user.click(durationCheck);
    expect(
      screen.queryByLabelText(/Duración \(minutos\)/i)
    ).not.toBeInTheDocument();
  });

  it("manages tags via keyboard Enter, suggestion clicks, and removal in TagInput", async () => {
    const user = userEvent.setup();

    function TagHarness() {
      const [tags, setTags] = React.useState<string[]>(["Vínculos"]);
      return (
        <TagInput
          value={tags}
          onChange={setTags}
          suggestions={["Duelo", "Vocación"]}
        />
      );
    }

    render(<TagHarness />);

    const input = screen.getByPlaceholderText(/Escribe una etiqueta/i);
    await user.type(input, "Umbral{Enter}");
    expect(screen.getByText("Umbral")).toBeInTheDocument();

    // Click suggestion chip
    await user.click(screen.getByRole("button", { name: "+ Vocación" }));
    expect(screen.getByText("Vocación")).toBeInTheDocument();

    // Remove tag
    await user.click(
      screen.getByRole("button", { name: "Quitar etiqueta Vínculos" })
    );
    expect(screen.queryByText("Vínculos")).not.toBeInTheDocument();
  });

  it("renders TarotCardPlate typographic bookplate and custom legitimate image URL", () => {
    const star = CANONICAL_TAROT_CARDS.find((c) => c.id === "major-17")!;
    const { rerender } = render(
      <TarotCardPlate card={star} orientation="upright" size="md" />
    );

    expect(screen.getByText("La Estrella")).toBeInTheDocument();
    expect(screen.getByText("XVII")).toBeInTheDocument();

    rerender(
      <TarotCardPlate
        card={star}
        orientation="reversed"
        customImageUrl="/laminas/estrella-propia.jpg"
        size="md"
      />
    );
    const img = screen.getByRole("img", {
      name: /Lámina de La Estrella \(invertida\)/i,
    });
    expect(img).toHaveClass("rotate-180");
  });

  it("hydrates AppShell without SSR/client attribute mismatches and restricts hamburger menu strictly to tablet", async () => {
    const sampleUser: User = {
      id: "user-hydration",
      email: "clara@grimorio.local",
      name: "Clara Montiel",
      workspaceName: "Mesa de Estudio",
      isDemo: false,
      preferences: {
        defaultDeckId: null,
        defaultSpreadId: null,
        compactTables: false,
        autosaveReadings: true,
      },
      createdAt: "2026-10-01T10:00:00.000Z",
    };

    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("dark"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const recoverableErrors: unknown[] = [];
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const ui = (
      <AppProviders>
        <AppShell
          user={sampleUser}
          draftReadingsCount={2}
          todayAppointmentsCount={1}
        >
          <div>Contenido principal móvil</div>
        </AppShell>
      </AppProviders>
    );

    const html = renderToString(ui);
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);

    let root: ReturnType<typeof hydrateRoot> | null = null;
    try {
      await act(async () => {
        root = hydrateRoot(container, ui, {
          onRecoverableError: (err) => recoverableErrors.push(err),
        });
      });

      expect(recoverableErrors).toHaveLength(0);
      expect(errorSpy).not.toHaveBeenCalled();

      // Hamburger menu is strictly hidden on mobile (< md) and desktop (>= lg), visible only on tablet (md..lg)
      const hamburgerBtn = screen.getByRole("button", {
        name: "Abrir menú de navegación",
      });
      expect(hamburgerBtn).toHaveClass("hidden", "md:flex", "lg:hidden");

      // Mobile bottom navigation bar is shown below md and hidden from md up
      const mobileBottomNav = screen.getByRole("navigation", {
        name: "Navegación móvil rápida",
      });
      expect(mobileBottomNav).toHaveClass("md:hidden");

      // Mobile header retains direct access to Ajustes y cuenta while hamburger is hidden on phones
      const mobileSettingsLink = screen.getByRole("link", {
        name: "Ajustes y cuenta",
      });
      expect(mobileSettingsLink).toHaveClass("md:hidden");
      expect(mobileSettingsLink).toHaveAttribute("href", "/ajustes");
    } finally {
      if (root) {
        await act(async () => {
          root?.unmount();
        });
      }
      container.remove();
      errorSpy.mockRestore();
      window.matchMedia = originalMatchMedia;
    }
  });
});
