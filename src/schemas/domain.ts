import { z } from "zod";

export const cardOrientationSchema = z.enum(["upright", "reversed"]);

export const deckTraditionSchema = z.enum([
  "rws",
  "marseille",
  "thoth",
  "lenormand",
  "living_wheel",
  "egipcio",
  "spanish",
  "visconti",
  "universal_waite",
  "modern_witch",
  "light_seers",
  "wild_unknown",
  "osho_zen",
  "other",
]);

export const readingStatusSchema = z.enum(["draft", "completed"]);

export const appointmentStatusSchema = z.enum([
  "scheduled",
  "completed",
  "cancelled",
]);

export const appointmentModalitySchema = z.enum([
  "in_person",
  "video",
  "audio",
  "written",
]);

export const deckPhaseSchema = z.enum([
  "shuffling",
  "cutting",
  "dealing",
  "base_of_deck",
  "closing",
  "other",
]);

export const phenomenonTypeSchema = z.enum([
  "jumped",
  "fell_to_floor",
  "base_card",
  "cut_reveal",
  "partially_hidden",
  "spontaneous_turn",
  "out_of_order",
  "other",
]);

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Ingresa tu correo electrónico.")
    .email("Ingresa un correo electrónico válido."),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Ingresa tu nombre.")
    .max(80, "El nombre no puede superar los 80 caracteres."),
  workspaceName: z
    .string()
    .trim()
    .max(80, "El nombre del espacio no puede superar los 80 caracteres.")
    .optional(),
  email: z
    .string()
    .trim()
    .min(1, "Ingresa tu correo electrónico.")
    .email("Ingresa un correo electrónico válido."),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres.")
    .max(128, "La contraseña es demasiado extensa."),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const consultantFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Registra al menos un nombre o alias.")
    .max(100, "Máximo 100 caracteres."),
  alias: z.string().trim().max(60, "Máximo 60 caracteres."),
  email: z
    .string()
    .trim()
    .refine(
      (val) => val.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      "Si incluyes correo electrónico, debe tener un formato válido."
    ),
  phone: z.string().trim().max(40, "Máximo 40 caracteres."),
  preferredChannel: z.string().trim().max(50, "Máximo 50 caracteres."),
  contextNotes: z.string().max(4000, "Máximo 4000 caracteres."),
  personalNotes: z.string().max(4000, "Máximo 4000 caracteres."),
  tags: z.array(z.string().trim().min(1).max(36)).max(15),
});

export type ConsultantFormValues = z.infer<typeof consultantFormSchema>;

export const appointmentFormSchema = z
  .object({
    consultantId: z.string(),
    quickNewConsultant: z.string().trim().max(100).optional(),
    title: z
      .string()
      .trim()
      .min(2, "Indica un motivo o título breve para la cita.")
      .max(120, "Máximo 120 caracteres."),
    scheduledAt: z
      .string()
      .min(1, "Selecciona la fecha y hora de la cita."),
    hasSpecificDuration: z.boolean(),
    durationMinutes: z.number().int().nullable(),
    modality: appointmentModalitySchema,
    status: appointmentStatusSchema,
    intention: z.string().max(1000, "Máximo 1000 caracteres."),
    prepNotes: z.string().max(2500, "Máximo 2500 caracteres."),
  })
  .superRefine((val, ctx) => {
    const isQuickNew = Boolean(
      val.quickNewConsultant && val.quickNewConsultant.trim().length > 0
    );
    if (
      !isQuickNew &&
      (!val.consultantId ||
        val.consultantId === "__new__" ||
        val.consultantId === "quick-new")
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["consultantId"],
        message: "Selecciona un consultante para la cita o registra uno nuevo.",
      });
    }

    if (val.hasSpecificDuration) {
      if (
        val.durationMinutes === null ||
        Number.isNaN(val.durationMinutes) ||
        val.durationMinutes < 15 ||
        val.durationMinutes > 240
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["durationMinutes"],
          message: "Indica una duración entre 15 y 240 minutos.",
        });
      }
    }
  });

export type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

export const deckFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Indica el nombre del mazo.")
    .max(100, "Máximo 100 caracteres."),
  tradition: deckTraditionSchema,
  author: z.string().trim().max(100, "Máximo 100 caracteres."),
  cardCount: z
    .number()
    .int()
    .min(10, "Un mazo debe tener al menos 10 cartas.")
    .max(150, "Máximo 150 cartas."),
  description: z.string().max(1500, "Máximo 1500 caracteres."),
  isDefault: z.boolean(),
});

export type DeckFormValues = z.infer<typeof deckFormSchema>;

export const spreadPositionSchema = z.object({
  positionIndex: z.number().int().min(1).max(30),
  title: z.string().trim().min(1, "Cada posición necesita un nombre.").max(80),
  prompt: z.string().trim().max(240),
  coordX: z.number().min(5).max(95),
  coordY: z.number().min(5).max(95),
});

export const spreadTemplateFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Indica el nombre de la tirada.")
    .max(90, "Máximo 90 caracteres."),
  category: z.string().trim().min(2, "Indica una categoría.").max(50),
  description: z.string().max(600, "Máximo 600 caracteres."),
  positions: z
    .array(spreadPositionSchema)
    .min(1, "Agrega al menos una posición a la tirada.")
    .max(20, "Máximo 20 posiciones por plantilla."),
});

export type SpreadTemplateFormValues = z.infer<typeof spreadTemplateFormSchema>;

export const readingCardInputSchema = z.object({
  positionIndex: z.number().int().min(1).max(30),
  positionTitle: z
    .string()
    .trim()
    .min(1, "Indica el nombre de la posición.")
    .max(100),
  positionPrompt: z.string().max(240),
  cardId: z.string().min(1, "Selecciona la carta colocada."),
  orientation: cardOrientationSchema,
  observationNotes: z.string().max(2500),
  contextualInterpretation: z.string().max(3500),
  personalTakeaway: z.string().max(2500),
  syncToGrimorio: z.boolean(),
});

export type ReadingCardInput = z.infer<typeof readingCardInputSchema>;

export const createReadingSchema = z
  .object({
    title: z.string().trim().max(140, "Máximo 140 caracteres."),
    consultantId: z.string(),
    appointmentId: z.string(),
    deckIds: z.array(z.string()).max(10),
    quickNewDecks: z
      .array(z.string().trim().min(1).max(100))
      .max(5),
    quickNewConsultant: z.string().trim().max(100).optional(),
    spreadMode: z.enum(["classic", "custom"]),
    spreadTemplateId: z.string(),
    spreadName: z.string().trim().max(100),
    customPositions: z.array(spreadPositionSchema).max(20),
    questionIntention: z.string().max(2000, "Máximo 2000 caracteres."),
    sessionContext: z.string().max(3000, "Máximo 3000 caracteres."),
    performedAt: z.string().min(1, "Indica la fecha y hora de la lectura."),
  })
  .superRefine((val, ctx) => {
    if (val.spreadMode === "custom" && val.customPositions.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["customPositions"],
        message: "Agrega al menos una carta en la estructura personalizada.",
      });
    }
  });

export type CreateReadingValues = z.infer<typeof createReadingSchema>;

export const updateReadingSessionSchema = z.object({
  readingId: z.string().min(1),
  title: z
    .string()
    .trim()
    .min(1, "Asigna un título a la lectura.")
    .max(140, "Máximo 140 caracteres."),
  consultantId: z.string(),
  deckIds: z.array(z.string()).max(10),
  spreadTemplateId: z.string(),
  spreadName: z.string().trim().min(1, "Indica el tipo de tirada.").max(100),
  customPositions: z.array(spreadPositionSchema).max(30),
  questionIntention: z.string().max(2000),
  sessionContext: z.string().max(3000),
  status: readingStatusSchema,
  performedAt: z.string().min(1, "La fecha es obligatoria."),
  generalObservations: z.string().max(4000),
  sessionSynthesis: z.string().max(5000),
  closingReflections: z.string().max(4000),
  tags: z.array(z.string().trim().min(1).max(36)).max(20),
  cards: z.array(readingCardInputSchema).max(30),
});

export type UpdateReadingSessionValues = z.infer<
  typeof updateReadingSessionSchema
>;

export const deckEventFormSchema = z.object({
  readingId: z.string().min(1, "El evento debe vincularse a una lectura."),
  cardId: z.string(),
  occurredPhase: deckPhaseSchema,
  phenomenonType: phenomenonTypeSchema,
  customPhenomenonLabel: z.string().trim().max(80, "Máximo 80 caracteres."),
  linkedPositionIndex: z.number().int().min(1).max(30).nullable(),
  observationDescription: z
    .string()
    .trim()
    .min(3, "Describe brevemente qué ocurrió con el mazo.")
    .max(2000, "Máximo 2000 caracteres."),
  personalInterpretation: z.string().max(2000, "Máximo 2000 caracteres."),
  occurredAt: z.string().min(1, "Indica el momento del evento."),
  tags: z.array(z.string().trim().min(1).max(36)).max(12),
});

export type DeckEventFormValues = z.infer<typeof deckEventFormSchema>;

export const personalCardEntrySchema = z.object({
  cardId: z.string().min(1),
  deckId: z.string(),
  customImageUrl: z
    .string()
    .trim()
    .refine(
      (val) => val.length === 0 || /^https?:\/\/.+/.test(val) || val.startsWith("/"),
      "La URL de imagen debe comenzar con https://, http:// o ruta local /."
    ),
  personalMeaning: z.string().max(5000, "Máximo 5000 caracteres."),
  reversedMeaning: z.string().max(4000, "Máximo 4000 caracteres."),
  symbolsAssociations: z.string().max(3000, "Máximo 3000 caracteres."),
  keywords: z.array(z.string().trim().min(1).max(40)).max(24),
  reflections: z.string().max(5000, "Máximo 5000 caracteres."),
  tags: z.array(z.string().trim().min(1).max(36)).max(15),
  logEvolutionEntry: z.boolean(),
  evolutionNoteTitle: z.string().trim().max(100),
});

export type PersonalCardEntryValues = z.infer<typeof personalCardEntrySchema>;

export const workspaceProfileSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres.").max(80),
  workspaceName: z.string().trim().min(2, "Mínimo 2 caracteres.").max(80),
  defaultDeckId: z.string(),
  defaultSpreadId: z.string(),
  compactTables: z.boolean(),
  autosaveReadings: z.boolean(),
});

export type WorkspaceProfileValues = z.infer<typeof workspaceProfileSchema>;

export const workspaceBackupSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  workspaceName: z.string(),
  consultants: z.array(
    z.object({
      id: z.string(),
      fullName: z.string().min(1),
      alias: z.string().nullable(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
      preferredChannel: z.string().nullable(),
      contextNotes: z.string(),
      personalNotes: z.string(),
      avatarHue: z.number(),
      archivedAt: z.string().nullable(),
      tags: z.array(z.string()),
    })
  ),
  decks: z.array(
    z.object({
      id: z.string(),
      name: z.string().min(1),
      tradition: deckTraditionSchema,
      author: z.string().nullable(),
      cardCount: z.number().int().min(1),
      description: z.string(),
      isDefault: z.boolean(),
    })
  ),
  cardEntries: z.array(
    z.object({
      cardId: z.string(),
      deckId: z.string().nullable(),
      customImageUrl: z.string().nullable(),
      personalMeaning: z.string(),
      reversedMeaning: z.string(),
      symbolsAssociations: z.string(),
      keywords: z.array(z.string()),
      reflections: z.string(),
      tags: z.array(z.string()),
    })
  ),
  readings: z.array(
    z.object({
      id: z.string(),
      consultantId: z.string().nullable(),
      deckId: z.string().nullable(),
      deckIds: z.array(z.string()).optional(),
      spreadTemplateId: z.string().nullable(),
      spreadName: z.string(),
      customPositions: z.array(spreadPositionSchema).optional(),
      title: z.string(),
      questionIntention: z.string(),
      sessionContext: z.string(),
      status: readingStatusSchema,
      performedAt: z.string(),
      generalObservations: z.string(),
      sessionSynthesis: z.string(),
      closingReflections: z.string(),
      tags: z.array(z.string()),
      cards: z.array(
        z.object({
          positionIndex: z.number().int().min(1),
          positionTitle: z.string(),
          positionPrompt: z.string(),
          cardId: z.string(),
          orientation: cardOrientationSchema,
          observationNotes: z.string(),
          contextualInterpretation: z.string(),
          personalTakeaway: z.string(),
        })
      ),
      events: z.array(
        z.object({
          cardId: z.string().nullable(),
          occurredPhase: deckPhaseSchema,
          phenomenonType: phenomenonTypeSchema,
          customPhenomenonLabel: z.string().nullable(),
          linkedPositionIndex: z.number().int().nullable(),
          observationDescription: z.string(),
          personalInterpretation: z.string(),
          occurredAt: z.string(),
          tags: z.array(z.string()),
        })
      ),
    })
  ),
      appointments: z.array(
    z.object({
      id: z.string(),
      consultantId: z.string(),
      title: z.string(),
      scheduledAt: z.string(),
      durationMinutes: z.number().int().min(5).nullable(),
      modality: appointmentModalitySchema,
      status: appointmentStatusSchema,
      intention: z.string(),
      prepNotes: z.string(),
    })
  ),
});

export const onboardingExperienceLevelSchema = z.enum([
  "novice",
  "intermediate",
  "professional",
]);

export const onboardingReadingTargetTypeSchema = z.enum([
  "for_me",
  "no_consultant",
  "consultant",
]);

export const onboardingProgressSchema = z.object({
  currentStep: z.number().int().min(1).max(6).optional(),
  experienceLevel: onboardingExperienceLevelSchema.nullable().optional(),
  usagePurposes: z.array(z.string()).optional(),
  selectedDeckId: z.string().nullable().optional(),
  customDeckCreatedId: z.string().nullable().optional(),
  skippedAppointmentDemo: z.boolean().optional(),
  createdAppointmentId: z.string().nullable().optional(),
  skippedReadingDemo: z.boolean().optional(),
  createdReadingId: z.string().nullable().optional(),
  readingTargetType: onboardingReadingTargetTypeSchema.nullable().optional(),
  targetConsultantId: z.string().nullable().optional(),
});

export type OnboardingProgressInput = z.infer<typeof onboardingProgressSchema>;

