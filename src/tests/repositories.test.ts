// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  createAppointment,
  listAppointments,
  updateAppointmentStatus,
} from "@/repositories/appointments-repository";
import {
  createConsultant,
  getConsultantById,
  getConsultantDetail,
  listConsultants,
  setConsultantArchived,
  updateConsultant,
} from "@/repositories/consultants-repository";
import {
  createDeck,
  createQuickDeck,
  deleteDeck,
  getGrimorioCardBySlug,
  listAllCardsIncludingCustom,
  listAvailableDecks,
  listDecks,
  listGrimorioCards,
  listSpreadTemplates,
  updateDeck,
  upsertPersonalCardEntry,
} from "@/repositories/grimorio-repository";
import {
  createDeckEvent,
  createReadingDraft,
  getDashboardSnapshot,
  getReadingDetail,
  listReadings,
  updateReadingSession,
} from "@/repositories/readings-repository";
import {
  authenticateUser,
  exportWorkspaceBackup,
  importWorkspaceBackup,
  registerNewUser,
  saveUserOnboardingProgress,
  updateUserWorkspaceProfile,
} from "@/repositories/users-repository";
import { createDatabaseInstance } from "@/server/db";

describe("Mesa de Tarot relational repositories & multi-user isolation", () => {
  it("initializes 78 canonical tarot cards and starts with clean empty workspace", async () => {
    const db = createDatabaseInstance(":memory:", { seedDemo: false });
    const user = await registerNewUser(
      {
        name: "Usuario Tarot",
        workspaceName: "Mesa Limpia",
        email: "tarot@limpio.org",
        password: "clave-segura-123",
      },
      db
    );

    const cards = await listGrimorioCards(user.id, {}, db);
    expect(cards).toHaveLength(318);

    const rwsCards = cards.filter((c) => c.card.deckTradition === "rws");
    expect(rwsCards).toHaveLength(78);
    const rwsMajors = rwsCards.filter((c) => c.card.arcana === "major");
    expect(rwsMajors).toHaveLength(22);

    const snapshot = await getDashboardSnapshot(user.id, db);
    expect(snapshot.counts.completedReadings).toBe(0);
    expect(snapshot.counts.draftReadings).toBe(0);
    expect(snapshot.counts.annotatedCards).toBe(0);
    expect(snapshot.counts.recordedPhenomena).toBe(0);
    expect(snapshot.incompleteDecks).toHaveLength(0);
    expect(snapshot.incompleteConsultants).toHaveLength(0);
    expect(await listConsultants(user.id, {}, db)).toHaveLength(0);
    expect(await listDecks(user.id, db)).toHaveLength(0);
  });

  it("seeds editable canonical cards into new custom decks when requested", async () => {
    const db = createDatabaseInstance(":memory:", { seedDemo: false });
    const user = await registerNewUser(
      {
        name: "Usuaria de mazos propios",
        workspaceName: "Mesa de prueba",
        email: "mazos-propios@limpio.org",
        password: "clave-segura-123",
      },
      db
    );

    const customTarot = await createDeck(
      user.id,
      {
        name: "Tarot Egipcio",
        tradition: "other",
        author: "",
        cardCount: 78,
        includeClassicStructure: true,
        description: "",
        isDefault: true,
      },
      db
    );
    const customMarseille = await createDeck(
      user.id,
      {
        name: "Marsella de prueba",
        tradition: "marseille",
        author: "",
        cardCount: 78,
        description: "",
        isDefault: false,
      },
      db
    );
    const emptyOracle = await createDeck(
      user.id,
      {
        name: "Oráculo breve",
        tradition: "other",
        author: "",
        cardCount: 36,
        includeClassicStructure: false,
        description: "",
        isDefault: false,
      },
      db
    );

    const cards = await listAllCardsIncludingCustom(user.id, db);
    const egyptCards = cards.filter(
      (card) => card.deckTradition === customTarot.id
    );
    const marseilleCards = cards.filter(
      (card) => card.deckTradition === customMarseille.id
    );

    expect(egyptCards).toHaveLength(78);
    expect(egyptCards.filter((card) => card.arcana === "major")).toHaveLength(22);
    expect(egyptCards.filter((card) => card.arcana === "minor")).toHaveLength(56);
    expect(marseilleCards).toHaveLength(78);
    expect(
      cards.filter((card) => card.deckTradition === emptyOracle.id)
    ).toHaveLength(0);
    expect(egyptCards[0]?.id).not.toBe("major-00");
  });

  it("removes unused cloned cards when deleting a deck and retains referenced cards", async () => {
    const db = createDatabaseInstance(":memory:", { seedDemo: false });
    const user = await registerNewUser(
      {
        name: "Usuaria de mazos propios",
        workspaceName: "Mesa de prueba",
        email: "eliminar-mazo@limpio.org",
        password: "clave-segura-123",
      },
      db
    );
    const deck = await createDeck(
      user.id,
      {
        name: "Mazo temporal",
        tradition: "other",
        author: "",
        cardCount: 78,
        includeClassicStructure: true,
        description: "",
        isDefault: false,
      },
      db
    );
    const clonedCards = (await db
      .prepare(
        "SELECT id FROM cards_catalog WHERE deck_tradition = ? ORDER BY rank_number"
      )
      .all(deck.id)) as Array<{ id: string }>;
    const retainedCardId = clonedCards[0].id;

    await db
      .prepare(
        `INSERT INTO card_entries (id, user_id, card_id, deck_id, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run("entry-deck-reference", user.id, retainedCardId, deck.id, new Date().toISOString());

    await deleteDeck(user.id, deck.id, db);

    const remainingCards = (await db
      .prepare("SELECT id FROM cards_catalog WHERE deck_tradition = ?")
      .all(deck.id)) as Array<{ id: string }>;
    const retainedEntry = (await db
      .prepare("SELECT deck_id FROM card_entries WHERE id = ?")
      .get("entry-deck-reference")) as { deck_id: string | null };

    expect(clonedCards).toHaveLength(78);
    expect(remainingCards).toEqual([{ id: retainedCardId }]);
    expect(retainedEntry.deck_id).toBeNull();
  });

  it("persists builtin deck references when a reading selects a virtual deck", async () => {
    const db = createDatabaseInstance(":memory:", { seedDemo: false });
    const user = await registerNewUser(
      {
        name: "Usuario de mazos",
        workspaceName: "Mesa de mazos",
        email: "mazos@limpio.org",
        password: "clave-segura-123",
      },
      db
    );

    const decks = await listAvailableDecks(user.id, db);
    expect(decks).toHaveLength(5);
    expect(decks.every((deck) => deck.isBuiltin)).toBe(true);
    expect(decks.find((deck) => deck.isDefault)?.tradition).toBe("rws");
    const defaultDeck = decks.find((deck) => deck.isDefault)!;

    const reading = await createReadingDraft(
      user.id,
      {
        title: "Lectura con mazo integrado",
        consultantId: "",
        appointmentId: "",
        deckIds: [defaultDeck.id],
        quickNewDecks: [],
        quickNewConsultant: "",
        spreadMode: "classic",
        spreadTemplateId: "spread-triad-observation",
        spreadName: "Pasado, Presente y Futuro (3 cartas)",
        customPositions: [],
        questionIntention: "",
        sessionContext: "",
        performedAt: "2026-11-01T00:30:00.000Z",
      },
      db
    );

    expect(reading.decks.map((deck) => deck.tradition)).toEqual(["rws"]);
    const storedDeck = (await listDecks(user.id, db)).find(
      (deck) => deck.id === reading.decks[0]?.id
    );
    expect(storedDeck?.userId).toBe(user.id);
  });

  it("enforces strict user isolation between private accounts and demo data", async () => {
    const db = createDatabaseInstance(":memory:", { seedDemo: true });
    const privateUser = await registerNewUser(
      {
        name: "Lucía Ríos",
        workspaceName: "Consultorio del Norte",
        email: "lucia@estudio.org",
        password: "clave-segura-lecturas",
      },
      db
    );

    expect(privateUser.isDemo).toBe(false);
    expect(await listConsultants(privateUser.id, {}, db)).toHaveLength(0);
    expect(await listReadings(privateUser.id, {}, db)).toHaveLength(0);

    const authenticated = await authenticateUser(
      {
        email: "lucia@estudio.org",
        password: "clave-segura-lecturas",
      },
      db
    );
    expect(authenticated?.id).toBe(privateUser.id);
    expect(
      await authenticateUser(
        { email: "lucia@estudio.org", password: "incorrecta-password" },
        db
      )
    ).toBeNull();
  });

  it("supports complete workflow: consultant -> optional duration appointment -> multi-deck + quick deck -> progressive reading -> deck event -> card note sync", async () => {
    const db = createDatabaseInstance(":memory:", { seedDemo: false });
    const user = await registerNewUser(
      {
        name: "Mateo Soler",
        workspaceName: "Archivo Central",
        email: "mateo@estudio.org",
        password: "password-fuerte-123",
      },
      db
    );

    const consultant = await createConsultant(
      user.id,
      {
        fullName: "Alias: Viajera Sur",
        alias: "Viajera Sur",
        email: "",
        phone: "",
        preferredChannel: "Presencial",
        contextNotes: "Explora cambio de oficio artesanal.",
        personalNotes: "Prefiere tiradas breves de tres cartas.",
        tags: ["Oficio", "Seguimiento"],
      },
      db
    );
    expect(consultant.displayName).toBe("Viajera Sur");
    expect(consultant.tags.map((t) => t.name)).toContain("Oficio");

    const deck = await createDeck(
      user.id,
      {
        name: "Marsella Clásico",
        tradition: "marseille",
        author: "Conver",
        cardCount: 78,
        description: "Edición de estudio",
        isDefault: true,
      },
      db
    );
    expect(deck.needsSetup).toBe(false);

    // Appointment WITHOUT specific duration (optional duration unchecked)
    const apptWithoutDuration = await createAppointment(
      user.id,
      {
        consultantId: consultant.id,
        title: "Consulta breve sin duración fija",
        scheduledAt: "2026-10-27T18:00:00.000Z",
        hasSpecificDuration: false,
        durationMinutes: null,
        modality: "video",
        status: "scheduled",
        intention: "Seguimiento puntual.",
        prepNotes: "",
      },
      db
    );
    expect(apptWithoutDuration.durationMinutes).toBeNull();

    // Appointment WITH specific duration
    const appt = await createAppointment(
      user.id,
      {
        consultantId: consultant.id,
        title: "Primera sesión de otoño",
        scheduledAt: "2026-10-28T15:00:00.000Z",
        hasSpecificDuration: true,
        durationMinutes: 60,
        modality: "in_person",
        status: "scheduled",
        intention: "Revisar apertura de taller cerámico.",
        prepNotes: "Usar Marsella.",
      },
      db
    );
    expect(appt.durationMinutes).toBe(60);
    expect(await listAppointments(user.id, {}, db)).toHaveLength(2);

    // Create reading draft selecting existing deck + inline quick-registered deck
    const draft = await createReadingDraft(
      user.id,
      {
        title: "Apertura de taller cerámico",
        consultantId: consultant.id,
        appointmentId: appt.id,
        deckIds: [deck.id],
        quickNewDecks: ["Tarot Egipcio Kier"],
        spreadMode: "classic",
        spreadTemplateId: "spread-triad-observation",
        spreadName: "Pasado, Presente y Futuro (3 cartas)",
        customPositions: [],
        questionIntention: "¿Qué pide atención práctica este mes?",
        sessionContext: "Mesa tranquila por la tarde.",
        performedAt: "2026-10-28T15:05:00.000Z",
      },
      db
    );
    expect(draft.status).toBe("draft");
    expect(draft.deckIds).toHaveLength(2);
    expect(draft.decks.map((d) => d.name)).toEqual([
      "Marsella Clásico",
      "Tarot Egipcio Kier",
    ]);

    // Quick-registered deck is flagged with needsSetup = true and surfaces on Home dashboard
    const snapshotBeforeSetup = await getDashboardSnapshot(user.id, db);
    expect(snapshotBeforeSetup.incompleteDecks).toHaveLength(1);
    const pendingDeck = snapshotBeforeSetup.incompleteDecks[0]!;
    expect(pendingDeck.name).toBe("Tarot Egipcio Kier");
    expect(pendingDeck.needsSetup).toBe(true);

    // Completing deck details clears needsSetup and removes the Home notification
    const completedDeck = await updateDeck(
      user.id,
      pendingDeck.id,
      {
        name: "Tarot Egipcio Kier",
        tradition: "egipcio",
        author: "Editorial Kier",
        cardCount: 78,
        description: "Edición ilustrada tradicional.",
        isDefault: false,
      },
      db
    );
    expect(completedDeck.needsSetup).toBe(false);
    expect((await getDashboardSnapshot(user.id, db)).incompleteDecks).toHaveLength(0);
    expect(await listDecks(user.id, db)).toHaveLength(2);

    // Record deck event
    const event = await createDeckEvent(
      user.id,
      {
        readingId: draft.id,
        cardId: "major-01",
        occurredPhase: "shuffling",
        phenomenonType: "jumped",
        customPhenomenonLabel: "",
        linkedPositionIndex: 1,
        observationDescription: "I El Mago saltó cara arriba sobre la mesa.",
        personalInterpretation: "Disponibilidad inmediata de herramientas reales.",
        occurredAt: "2026-10-28T15:07:00.000Z",
        tags: ["Salto limpio"],
      },
      db
    );
    expect(event.card?.canonicalName).toBe("El Mago");

    // Complete reading with 3-layer separation and personal card note sync
    const completed = await updateReadingSession(
      user.id,
      {
        readingId: draft.id,
        title: "Apertura de taller cerámico",
        consultantId: consultant.id,
        deckIds: draft.deckIds,
        spreadTemplateId: "spread-triad-observation",
        spreadName: "Pasado, Presente y Futuro (3 cartas)",
        customPositions: [],
        questionIntention: "¿Qué pide atención práctica este mes?",
        sessionContext: "Mesa tranquila por la tarde.",
        status: "completed",
        performedAt: "2026-10-28T15:05:00.000Z",
        generalObservations: "Mezcla fluida tras el salto inicial.",
        sessionSynthesis: "Ya cuenta con los materiales esenciales para empezar.",
        closingReflections: "Revisar avances en diciembre.",
        tags: ["Oficio", "Inicio"],
        cards: [
          {
            positionIndex: 1,
            positionTitle: "Pasado",
            positionPrompt: "Origen",
            cardId: "major-01",
            orientation: "upright",
            observationNotes: "Integrada tras saltar en mezcla.",
            contextualInterpretation: "Destreza manual lista para usarse.",
            personalTakeaway:
              "El Mago al inicio pide obrar con lo que ya hay en la mesa.",
            syncToGrimorio: true,
          },
          {
            positionIndex: 2,
            positionTitle: "Presente",
            positionPrompt: "Estado actual",
            cardId: "pentacles-03",
            orientation: "upright",
            observationNotes: "Derecha en el centro.",
            contextualInterpretation: "Colaboración con colegas del taller.",
            personalTakeaway: "",
            syncToGrimorio: false,
          },
        ],
      },
      db
    );

    expect(completed.status).toBe("completed");
    expect(completed.cards).toHaveLength(2);
    expect(completed.events).toHaveLength(1);
    expect(completed.deckIds).toHaveLength(2);

    // Linked appointment auto-transitioned to completed
    const apptsAfter = await listAppointments(user.id, {}, db);
    const updatedMainAppt = apptsAfter.find((a) => a.id === appt.id);
    expect(updatedMainAppt?.status).toBe("completed");

    // Verify custom spread persistence & coordinate reordering
    const customDraft = await createReadingDraft(
      user.id,
      {
        title: "Tirada libre de dos cartas",
        consultantId: consultant.id,
        appointmentId: "",
        deckIds: [deck.id],
        quickNewDecks: [],
        spreadMode: "custom",
        spreadTemplateId: "",
        spreadName: "Personalizada",
        customPositions: [
          {
            positionIndex: 1,
            title: " Situación ",
            prompt: "Lo que está en juego",
            coordX: 28.5,
            coordY: 45,
          },
          {
            positionIndex: 2,
            title: "Consejo",
            prompt: "Acción sugerida",
            coordX: 72.5,
            coordY: 55,
          },
        ],
        questionIntention: "Revisión puntual.",
        sessionContext: "",
        performedAt: "2026-10-29T10:00:00.000Z",
      },
      db
    );
    expect(customDraft.customPositions).toHaveLength(2);
    expect(customDraft.customPositions[0]?.coordX).toBe(28.5);
    expect((await getReadingDetail(user.id, customDraft.id, db))?.customPositions).toHaveLength(2);

    // Verify card catalog cross-relations & evolution log
    await upsertPersonalCardEntry(
      user.id,
      {
        cardId: "major-01",
        deckId: "",
        customImageUrl: "",
        personalMeaning: "Articulación consciente entre idea y manos.",
        reversedMeaning: "Dispersión instrumental.",
        symbolsAssociations: "Mesa con los cuatro palos dispuestos.",
        keywords: ["mesa", "instrumentos"],
        reflections: "Carta clave para artesanos.",
        tags: ["Oficio"],
        logEvolutionEntry: true,
        evolutionNoteTitle: "Síntesis anual",
      },
      db
    );

    const magoDetail = await getGrimorioCardBySlug(user.id, "01-el-mago", db);
    expect(magoDetail?.appearances).toHaveLength(1);
    expect(magoDetail?.phenomena).toHaveLength(1);
    expect(magoDetail?.evolutionLog.length).toBeGreaterThanOrEqual(2);

    // Verify Consultant dossier relations
    const dossier = await getConsultantDetail(user.id, consultant.id, db);
    expect(dossier?.readings).toHaveLength(2);
    expect(dossier?.frequentCards[0]?.card.id).toBe("major-01");

    // Verify multi-dimensional search filters
    expect(
      await listReadings(user.id, { phenomenonType: "jumped" }, db)
    ).toHaveLength(1);
    expect(
      await listReadings(user.id, { cardId: "pentacles-03" }, db)
    ).toHaveLength(1);
    expect(
      await listReadings(user.id, { query: "materiales esenciales" }, db)
    ).toHaveLength(1);

    // Archive & restore consultant, status update, and JSON backup roundtrip
    const archived = await setConsultantArchived(user.id, consultant.id, true, db);
    expect(archived.archivedAt).not.toBeNull();
    await setConsultantArchived(user.id, consultant.id, false, db);
    await updateAppointmentStatus(user.id, appt.id, "completed", db);

    const backup = await exportWorkspaceBackup(user.id, db);
    expect(backup.readings).toHaveLength(2);

    const user2 = await registerNewUser(
      {
        name: "Destino Backup",
        workspaceName: "Restaurado",
        email: "backup@estudio.org",
        password: "password-fuerte-456",
      },
      db
    );
    const imported = await importWorkspaceBackup(user2.id, backup, db);
    expect(imported.importedReadings).toBe(2);
    const restoredReadings = await listReadings(user2.id, {}, db);
    expect(restoredReadings).toHaveLength(2);
  });

  it("supports quick consultant registration during reading creation and setup reminders in dashboard", async () => {
    const db = createDatabaseInstance(":memory:", { seedDemo: false });
    const user = await registerNewUser(
      {
        name: "Luz Barral",
        workspaceName: "Espacio Índigo",
        email: "luz@indigo.org",
        password: "clave-segura-luz",
      },
      db
    );

    // Initial state: 0 incomplete consultants
    expect((await getDashboardSnapshot(user.id, db)).incompleteConsultants).toHaveLength(0);

    // Quick-registered consultant via reading creation
    const draft = await createReadingDraft(
      user.id,
      {
        title: "Lectura para nueva consultante",
        consultantId: "__new__",
        appointmentId: "",
        deckIds: [],
        quickNewDecks: [],
        quickNewConsultant: "Valeria Morales",
        spreadMode: "custom",
        spreadTemplateId: "",
        spreadName: "Estructura personalizada",
        customPositions: [
          {
            positionIndex: 1,
            title: "Carta 1",
            prompt: "Punto de partida",
            coordX: 50,
            coordY: 50,
          },
        ],
        questionIntention: "Orientación vocacional y creativa",
        sessionContext: "Primera sesión espontánea",
        performedAt: "2026-10-29T10:00:00.000Z",
      },
      db
    );

    expect(draft.consultantId).toBeTruthy();
    expect(draft.consultant?.displayName).toBe("Valeria Morales");

    const createdConsultant = await getConsultantById(user.id, draft.consultantId!, db);
    expect(createdConsultant?.displayName).toBe("Valeria Morales");
    expect(createdConsultant?.needsSetup).toBe(true);

    // Surfaces in Dashboard snapshot
    const snapshotWithIncomplete = await getDashboardSnapshot(user.id, db);
    expect(snapshotWithIncomplete.incompleteConsultants).toHaveLength(1);
    expect(snapshotWithIncomplete.incompleteConsultants[0]?.displayName).toBe("Valeria Morales");

    // Completing consultant details clears needsSetup and removes the Home notification
    const completedConsultant = await updateConsultant(
      user.id,
      draft.consultantId!,
      {
        fullName: "Valeria Morales",
        alias: "Valeria",
        email: "valeria@taller.org",
        phone: "+54 9 11 1234-5678",
        preferredChannel: "Presencial",
        contextNotes: "Arquitecta y ceramista.",
        personalNotes: "Trajo su propio cuaderno de notas.",
        tags: ["Arquitectura", "Diseño"],
      },
      db
    );
    expect(completedConsultant.needsSetup).toBe(false);
    expect((await getDashboardSnapshot(user.id, db)).incompleteConsultants).toHaveLength(0);
  });

  it("permite registrar un consultante rápido al agendar una sesión y registrar mazos rápidos", async () => {
    const db = createDatabaseInstance(":memory:", { seedDemo: false });
    const user = await registerNewUser(
      {
        name: "Luz",
        workspaceName: "Espacio Astral",
        email: "luz@astral.local",
        password: "password-segura-123",
      },
      db
    );

    // Agendar cita con registro rápido de nuevo consultante
    const appt = await createAppointment(
      user.id,
      {
        consultantId: "__new__",
        quickNewConsultant: "Ignacio Albarracín",
        title: "Lectura de tránsito anual",
        scheduledAt: "2026-11-15T15:00:00.000Z",
        hasSpecificDuration: true,
        durationMinutes: 60,
        modality: "video",
        status: "scheduled",
        intention: "Proyecciones profesionales",
        prepNotes: "Primera consulta",
      },
      db
    );

    expect(appt.id).toBeTruthy();
    expect(appt.consultantDisplayName).toBe("Ignacio Albarracín");

    const createdConsultant = await getConsultantById(user.id, appt.consultantId, db);
    expect(createdConsultant).not.toBeNull();
    expect(createdConsultant?.fullName).toBe("Ignacio Albarracín");
    expect(createdConsultant?.needsSetup).toBe(true);

    const snapshot = await getDashboardSnapshot(user.id, db);
    expect(snapshot.incompleteConsultants.some((c) => c.id === appt.consultantId)).toBe(true);

    // Registro de mazo rápido
    const quickDeck = await createQuickDeck(user.id, "Tarot Esotérico de Marsella", db);
    expect(quickDeck.id).toBeTruthy();
    expect(quickDeck.name).toBe("Tarot Esotérico de Marsella");
    expect(quickDeck.needsSetup).toBe(true);

    const snapshotWithDeck = await getDashboardSnapshot(user.id, db);
    expect(snapshotWithDeck.incompleteDecks.some((d) => d.id === quickDeck.id)).toBe(true);
  });

  it("supports creating and retrieving custom spread readings with repositioned cards", async () => {
    const db = createDatabaseInstance(":memory:", { seedDemo: false });
    const user = await registerNewUser(
      {
        name: "Tarotista Custom",
        workspaceName: "Mesa Experimental",
        email: "custom@tarot.org",
        password: "clave-segura-123",
      },
      db
    );

    const primaryDeck = await createDeck(
      user.id,
      {
        name: "Tarot de Estudio",
        tradition: "rws",
        author: "Pamela Colman Smith",
        description: "Mazo de prueba",
        cardCount: 78,
        isDefault: true,
      },
      db
    );
    expect(primaryDeck).toBeDefined();

    const customPositions = [
      {
        positionIndex: 1,
        title: "Origen",
        prompt: "Raíz de la consulta",
        coordX: 20,
        coordY: 45,
      },
      {
        positionIndex: 2,
        title: "Desafío",
        prompt: "Fuerza antagonista",
        coordX: 50,
        coordY: 55,
      },
      {
        positionIndex: 3,
        title: "Desenlace",
        prompt: "Resolución proyectada",
        coordX: 80,
        coordY: 45,
      },
    ];

    const reading = await createReadingDraft(
      user.id,
      {
        title: "Sesión personalizada 3 cartas",
        consultantId: "",
        appointmentId: "",
        deckIds: primaryDeck ? [primaryDeck.id] : [],
        quickNewDecks: [],
        quickNewConsultant: "",
        spreadMode: "custom",
        spreadTemplateId: "",
        spreadName: "Estructura personalizada",
        customPositions,
        questionIntention: "¿Hacia dónde evoluciona este proyecto?",
        sessionContext: "Consulta privada de prueba.",
        performedAt: "2026-10-27T16:00:00.000Z",
      },
      db
    );

    expect(reading.id).toBeTruthy();
    expect(reading.spreadName).toBe("Estructura personalizada");
    expect(reading.customPositions).toHaveLength(3);
    expect(reading.customPositions[0]?.coordX).toBe(20);
    expect(reading.customPositions[0]?.title).toBe("Origen");
    expect(reading.customPositions[1]?.coordX).toBe(50);
    expect(reading.customPositions[2]?.coordX).toBe(80);

    // Verify reading detail can be retrieved immediately
    const retrieved = await getReadingDetail(user.id, reading.id, db);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(reading.id);
    expect(retrieved?.customPositions).toHaveLength(3);
    expect(retrieved?.title).toBe("Sesión personalizada 3 cartas");
  });

  it("GT-BUG-002: preserves onboarding state when updating workspace profile in /ajustes", async () => {
    const db = createDatabaseInstance(":memory:", { seedDemo: false });
    const user = await registerNewUser(
      {
        name: "Valeria Tarot",
        workspaceName: "Mesa Valeria",
        email: "valeria@onboarding.org",
        password: "clave-segura-valeria",
      },
      db
    );

    // Complete onboarding
    const onboardedUser = await saveUserOnboardingProgress(
      user.id,
      { completed: true, currentStep: 6, experienceLevel: "intermediate" },
      db
    );
    expect(onboardedUser.preferences.onboarding?.completed).toBe(true);

    // Now update profile settings in /ajustes
    const updatedUser = await updateUserWorkspaceProfile(
      user.id,
      {
        name: "Valeria R.",
        workspaceName: "Mesa Central 🔮",
        defaultDeckId: "",
        defaultSpreadId: "spread-celtic-cross",
        compactTables: true,
        autosaveReadings: false,
      },
      db
    );

    expect(updatedUser.name).toBe("Valeria R.");
    expect(updatedUser.workspaceName).toBe("Mesa Central 🔮");
    expect(updatedUser.preferences.compactTables).toBe(true);
    expect(updatedUser.preferences.autosaveReadings).toBe(false);
    // CRITICAL: Onboarding state MUST be preserved!
    expect(updatedUser.preferences.onboarding?.completed).toBe(true);
    expect(updatedUser.preferences.onboarding?.currentStep).toBe(6);
    expect(updatedUser.preferences.onboarding?.experienceLevel).toBe("intermediate");
  });

  it("GT-BUG-004: ensures builtin spread templates are always synced and available", async () => {
    const db = createDatabaseInstance(":memory:", { seedDemo: false });
    const user = await registerNewUser(
      {
        name: "Test Spreads",
        workspaceName: "Mesa Spreads",
        email: "spreads@test.org",
        password: "clave-segura-spreads",
      },
      db
    );

    const spreads = await listSpreadTemplates(user.id, db);
    expect(spreads.length).toBeGreaterThanOrEqual(4);
    const builtinIds = spreads.filter((s) => s.isBuiltin).map((s) => s.id);
    expect(builtinIds).toContain("spread-triad-observation");
    expect(builtinIds).toContain("spread-celtic-cross");
  });

  it("GT-BUG-003: queries and sorts consultants without column alias resolution errors", async () => {
    const db = createDatabaseInstance(":memory:", { seedDemo: false });
    const user = await registerNewUser(
      {
        name: "Consultant Tester",
        workspaceName: "Mesa Consultantes",
        email: "consultantes@test.org",
        password: "clave-segura-consultantes",
      },
      db
    );

    // Initially empty
    const emptyList = await listConsultants(user.id, { query: "", tag: "" }, db);
    expect(emptyList).toEqual([]);

    // Create consultant
    const consultant = await createConsultant(
      user.id,
      {
        fullName: "Sofía Navarro",
        alias: "Sofi N.",
        email: "sofia@ejemplo.com",
        phone: "+54 9 11 1234-5678",
        preferredChannel: "Presencial",
        contextNotes: "Estudio de diseño",
        personalNotes: "Trae cuaderno",
        tags: ["Seguimiento", "Laboral"],
      },
      db
    );

    expect(consultant.id).toBeTruthy();
    expect(consultant.displayName).toBe("Sofi N.");

    // Query with filter options
    const filtered = await listConsultants(user.id, { query: "Navarro" }, db);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.displayName).toBe("Sofi N.");

    const byTag = await listConsultants(user.id, { tag: "Seguimiento" }, db);
    expect(byTag).toHaveLength(1);
  });

  it("GT-BUG-003: lists appointments with LEFT JOIN resiliently", async () => {
    const db = createDatabaseInstance(":memory:", { seedDemo: false });
    const user = await registerNewUser(
      {
        name: "Agenda Tester",
        workspaceName: "Mesa Agenda",
        email: "agenda@test.org",
        password: "clave-segura-agenda",
      },
      db
    );

    const consultant = await createConsultant(
      user.id,
      {
        fullName: "Mateo Rossi",
        alias: "Mateo",
        email: "",
        phone: "",
        preferredChannel: "Virtual",
        contextNotes: "",
        personalNotes: "",
        tags: [],
      },
      db
    );

    const appt = await createAppointment(
      user.id,
      {
        consultantId: consultant.id,
        title: "Sesión de Tarot Evolutivo",
        scheduledAt: "2026-11-01T15:00:00.000Z",
        hasSpecificDuration: true,
        durationMinutes: 60,
        modality: "video",
        status: "scheduled",
        intention: "Claridad vocacional",
        prepNotes: "Mazo Marsella",
      },
      db
    );

    expect(appt.id).toBeTruthy();
    const list = await listAppointments(user.id, { ascending: true }, db);
    expect(list).toHaveLength(1);
    expect(list[0]?.consultantDisplayName).toBe("Mateo");
  });
});
