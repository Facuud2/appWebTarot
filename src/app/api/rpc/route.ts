import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createAppointment,
  deleteAppointment,
  updateAppointment,
  updateAppointmentStatus,
} from "@/repositories/appointments-repository";
import {
  createConsultant,
  deleteConsultant,
  setConsultantArchived,
  updateConsultant,
} from "@/repositories/consultants-repository";
import {
  createDeck,
  createQuickDeck,
  createSpreadTemplate,
  deleteDeck,
  deleteSpreadTemplate,
  updateDeck,
  upsertPersonalCardEntry,
} from "@/repositories/grimorio-repository";
import {
  createDeckEvent,
  createReadingDraft,
  deleteDeckEvent,
  deleteReading,
  updateReadingSession,
} from "@/repositories/readings-repository";
import {
  authenticateUser,
  getDemoUser,
  importWorkspaceBackup,
  registerNewUser,
  updateUserWorkspaceProfile,
} from "@/repositories/users-repository";
import {
  appointmentFormSchema,
  appointmentStatusSchema,
  consultantFormSchema,
  createReadingSchema,
  deckEventFormSchema,
  deckFormSchema,
  loginSchema,
  personalCardEntrySchema,
  registerSchema,
  spreadTemplateFormSchema,
  updateReadingSessionSchema,
  workspaceProfileSchema,
} from "@/schemas/domain";
import {
  createUserSession,
  destroyCurrentSession,
  getCurrentUser,
  SESSION_COOKIE_NAME,
} from "@/server/session";
import type { ActionResult } from "@/types/domain";

const rpcEnvelopeSchema = z.object({
  op: z.string().min(1),
  payload: z.unknown().optional(),
});

function jsonResult<T>(body: ActionResult<T>, status = 200): NextResponse {
  return NextResponse.json(body, { status });
}

function safeRevalidatePath(path: string, type?: "layout" | "page") {
  try {
    if (type) {
      revalidatePath(path, type);
    } else {
      revalidatePath(path);
    }
  } catch {
    // Si se invoca fuera de un request context con static generation store, omitir de forma segura
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonResult(
      { ok: false, error: "Solicitud inválida." },
      400
    );
  }

  const envelope = rpcEnvelopeSchema.safeParse(rawBody);
  if (!envelope.success) {
    return jsonResult(
      { ok: false, error: "Operación no especificada." },
      400
    );
  }

  const { op, payload } = envelope.data;

  try {
    // Public auth operations
    if (op === "auth.login") {
      const parsed = loginSchema.safeParse(payload);
      if (!parsed.success) {
        return jsonResult({
          ok: false,
          error: "Revisa los datos de acceso ingresados.",
        });
      }
      const user = authenticateUser(parsed.data);
      if (!user) {
        return jsonResult({
          ok: false,
          error: "Correo o contraseña incorrectos.",
        });
      }
      const session = await createUserSession(user.id, request);
      safeRevalidatePath("/", "layout");
      const res = jsonResult({
        ok: true,
        data: user,
        message: `Sesión iniciada en ${user.workspaceName}.`,
      });
      res.cookies.set(SESSION_COOKIE_NAME, session.signedToken, session.cookieOptions);
      return res;
    }

    if (op === "auth.register") {
      const parsed = registerSchema.safeParse(payload);
      if (!parsed.success) {
        return jsonResult({
          ok: false,
          error: "Revisa los campos obligatorios para crear tu cuenta.",
        });
      }
      const user = registerNewUser(parsed.data);
      const session = await createUserSession(user.id, request);
      safeRevalidatePath("/", "layout");
      const res = jsonResult({
        ok: true,
        data: user,
        message: "Tu espacio de trabajo fue creado correctamente.",
      });
      res.cookies.set(SESSION_COOKIE_NAME, session.signedToken, session.cookieOptions);
      return res;
    }

    if (op === "auth.demo") {
      const demoUser = getDemoUser();
      const session = await createUserSession(demoUser.id, request);
      safeRevalidatePath("/", "layout");
      const res = jsonResult({
        ok: true,
        data: demoUser,
        message: "Ingresaste al espacio de demostración con datos de ejemplo.",
      });
      res.cookies.set(SESSION_COOKIE_NAME, session.signedToken, session.cookieOptions);
      return res;
    }

    if (op === "auth.logout") {
      await destroyCurrentSession(request);
      safeRevalidatePath("/", "layout");
      const res = jsonResult({
        ok: true,
        data: null,
        message: "Sesión cerrada correctamente.",
      });
      res.cookies.delete(SESSION_COOKIE_NAME);
      return res;
    }

    // Authenticated operations
    const user = await getCurrentUser(request);
    if (!user) {
      return jsonResult(
        {
          ok: false,
          error: "Tu sesión expiró o no es válida. Vuelve a iniciar sesión.",
        },
        401
      );
    }

    switch (op) {
      case "consultant.create": {
        const parsed = consultantFormSchema.safeParse(payload);
        if (!parsed.success) {
          return jsonResult({
            ok: false,
            error: "Revisa los campos de la ficha del consultante.",
          });
        }
        const created = createConsultant(user.id, parsed.data);
        safeRevalidatePath("/");
        safeRevalidatePath("/consultantes");
        safeRevalidatePath("/agenda");
        safeRevalidatePath("/lecturas/nueva");
        return jsonResult({
          ok: true,
          data: created,
          message: `Ficha de ${created.displayName} creada.`,
        });
      }

      case "consultant.update": {
        const body = z
          .object({ consultantId: z.string().min(1), input: consultantFormSchema })
          .safeParse(payload);
        if (!body.success) {
          return jsonResult({
            ok: false,
            error: "Revisa los datos ingresados en la ficha.",
          });
        }
        const updated = updateConsultant(
          user.id,
          body.data.consultantId,
          body.data.input
        );
        safeRevalidatePath("/");
        safeRevalidatePath("/consultantes");
        safeRevalidatePath(`/consultantes/${body.data.consultantId}`);
        safeRevalidatePath("/lecturas");
        return jsonResult({
          ok: true,
          data: updated,
          message: "Cambios guardados en la ficha del consultante.",
        });
      }

      case "consultant.toggleArchive": {
        const body = z
          .object({ consultantId: z.string().min(1), archived: z.boolean() })
          .safeParse(payload);
        if (!body.success) {
          return jsonResult({ ok: false, error: "Datos no válidos." });
        }
        const updated = setConsultantArchived(
          user.id,
          body.data.consultantId,
          body.data.archived
        );
        safeRevalidatePath("/");
        safeRevalidatePath("/consultantes");
        safeRevalidatePath(`/consultantes/${body.data.consultantId}`);
        return jsonResult({
          ok: true,
          data: updated,
          message: body.data.archived
            ? "Consultante movido al archivo."
            : "Consultante restaurado a la lista activa.",
        });
      }

      case "consultant.delete": {
        const body = z
          .object({ consultantId: z.string().min(1) })
          .safeParse(payload);
        if (!body.success) {
          return jsonResult({ ok: false, error: "Consultante no válido." });
        }
        deleteConsultant(user.id, body.data.consultantId);
        safeRevalidatePath("/");
        safeRevalidatePath("/consultantes");
        safeRevalidatePath("/agenda");
        safeRevalidatePath("/lecturas");
        return jsonResult({
          ok: true,
          data: null,
          message: "Ficha de consultante eliminada definitivamente.",
        });
      }

      case "appointment.create": {
        const parsed = appointmentFormSchema.safeParse(payload);
        if (!parsed.success) {
          return jsonResult({
            ok: false,
            error:
              parsed.error.issues[0]?.message ??
              "Revisa la fecha y el consultante de la cita.",
          });
        }
        const created = createAppointment(user.id, parsed.data);
        safeRevalidatePath("/");
        safeRevalidatePath("/agenda");
        safeRevalidatePath(`/consultantes/${created.consultantId}`);
        return jsonResult({
          ok: true,
          data: created,
          message: "Cita agendada correctamente.",
        });
      }

      case "appointment.update": {
        const body = z
          .object({
            appointmentId: z.string().min(1),
            input: appointmentFormSchema,
          })
          .safeParse(payload);
        if (!body.success) {
          return jsonResult({
            ok: false,
            error:
              body.error.issues[0]?.message ?? "Revisa los campos de la cita.",
          });
        }
        const updated = updateAppointment(
          user.id,
          body.data.appointmentId,
          body.data.input
        );
        safeRevalidatePath("/");
        safeRevalidatePath("/agenda");
        safeRevalidatePath(`/consultantes/${updated.consultantId}`);
        return jsonResult({
          ok: true,
          data: updated,
          message: "Cita actualizada.",
        });
      }

      case "appointment.changeStatus": {
        const body = z
          .object({
            appointmentId: z.string().min(1),
            status: appointmentStatusSchema,
          })
          .safeParse(payload);
        if (!body.success) {
          return jsonResult({ ok: false, error: "Estado de cita no válido." });
        }
        const updated = updateAppointmentStatus(
          user.id,
          body.data.appointmentId,
          body.data.status
        );
        safeRevalidatePath("/");
        safeRevalidatePath("/agenda");
        safeRevalidatePath(`/consultantes/${updated.consultantId}`);
        return jsonResult({
          ok: true,
          data: updated,
          message: "Estado de la cita actualizado.",
        });
      }

      case "appointment.delete": {
        const body = z
          .object({ appointmentId: z.string().min(1) })
          .safeParse(payload);
        if (!body.success) {
          return jsonResult({ ok: false, error: "Cita no válida." });
        }
        deleteAppointment(user.id, body.data.appointmentId);
        safeRevalidatePath("/");
        safeRevalidatePath("/agenda");
        safeRevalidatePath("/consultantes");
        return jsonResult({
          ok: true,
          data: null,
          message: "Cita eliminada de la agenda.",
        });
      }

      case "reading.createDraft": {
        const parsed = createReadingSchema.safeParse(payload);
        if (!parsed.success) {
          return jsonResult({
            ok: false,
            error:
              parsed.error.issues[0]?.message ??
              "Revisa los datos iniciales de la lectura.",
          });
        }
        const created = createReadingDraft(user.id, parsed.data);
        safeRevalidatePath("/");
        safeRevalidatePath("/lecturas");
        safeRevalidatePath("/grimorio");
        safeRevalidatePath("/agenda");
        if (created.consultantId) {
          safeRevalidatePath(`/consultantes/${created.consultantId}`);
        }
        return jsonResult({
          ok: true,
          data: created,
          message: "Mesa de lectura iniciada.",
        });
      }

      case "reading.saveSession": {
        const parsed = updateReadingSessionSchema.safeParse(payload);
        if (!parsed.success) {
          return jsonResult({
            ok: false,
            error:
              parsed.error.issues[0]?.message ??
              "Revisa que cada posición registrada tenga carta y nombre válidos.",
          });
        }
        const updated = updateReadingSession(user.id, parsed.data);
        safeRevalidatePath("/");
        safeRevalidatePath("/lecturas");
        safeRevalidatePath(`/lecturas/${updated.id}`);
        safeRevalidatePath("/grimorio");
        if (updated.consultantId) {
          safeRevalidatePath(`/consultantes/${updated.consultantId}`);
        }
        return jsonResult({
          ok: true,
          data: updated,
          message:
            updated.status === "completed"
              ? "Lectura completada y guardada en el historial."
              : "Borrador guardado correctamente.",
        });
      }

      case "reading.delete": {
        const body = z.object({ readingId: z.string().min(1) }).safeParse(payload);
        if (!body.success) {
          return jsonResult({ ok: false, error: "Lectura no válida." });
        }
        deleteReading(user.id, body.data.readingId);
        safeRevalidatePath("/");
        safeRevalidatePath("/lecturas");
        safeRevalidatePath("/fenomenos");
        safeRevalidatePath("/grimorio");
        return jsonResult({
          ok: true,
          data: null,
          message: "Lectura eliminada del historial.",
        });
      }

      case "reading.recordEvent": {
        const parsed = deckEventFormSchema.safeParse(payload);
        if (!parsed.success) {
          return jsonResult({
            ok: false,
            error:
              parsed.error.issues[0]?.message ??
              "Describe qué ocurrió con el mazo.",
          });
        }
        const event = createDeckEvent(user.id, parsed.data);
        safeRevalidatePath("/");
        safeRevalidatePath(`/lecturas/${parsed.data.readingId}`);
        safeRevalidatePath("/fenomenos");
        safeRevalidatePath("/grimorio");
        return jsonResult({
          ok: true,
          data: event,
          message: "Evento del mazo registrado.",
        });
      }

      case "reading.removeEvent": {
        const body = z
          .object({
            eventId: z.string().min(1),
            readingId: z.string().min(1),
          })
          .safeParse(payload);
        if (!body.success) {
          return jsonResult({ ok: false, error: "Evento no válido." });
        }
        deleteDeckEvent(user.id, body.data.eventId);
        safeRevalidatePath(`/lecturas/${body.data.readingId}`);
        safeRevalidatePath("/fenomenos");
        safeRevalidatePath("/grimorio");
        return jsonResult({
          ok: true,
          data: null,
          message: "Evento del mazo eliminado.",
        });
      }

      case "grimorio.saveCardEntry": {
        const body = z
          .object({
            slug: z.string().min(1),
            input: personalCardEntrySchema,
          })
          .safeParse(payload);
        if (!body.success) {
          return jsonResult({
            ok: false,
            error:
              body.error.issues[0]?.message ??
              "Revisa los campos de las notas de la carta.",
          });
        }
        const saved = upsertPersonalCardEntry(user.id, body.data.input);
        safeRevalidatePath("/");
        safeRevalidatePath("/grimorio");
        safeRevalidatePath(`/grimorio/${body.data.slug}`);
        return jsonResult({
          ok: true,
          data: saved,
          message: "Significado personal guardado.",
        });
      }

      case "grimorio.createDeck": {
        const parsed = deckFormSchema.safeParse(payload);
        if (!parsed.success) {
          return jsonResult({
            ok: false,
            error: parsed.error.issues[0]?.message ?? "Revisa los datos del mazo.",
          });
        }
        const created = createDeck(user.id, parsed.data);
        safeRevalidatePath("/");
        safeRevalidatePath("/grimorio");
        safeRevalidatePath("/ajustes");
        safeRevalidatePath("/lecturas/nueva");
        return jsonResult({
          ok: true,
          data: created,
          message: `Mazo «${created.name}» registrado.`,
        });
      }

      case "grimorio.createQuickDeck": {
        const body = z
          .object({
            name: z
              .string()
              .trim()
              .min(1, "Indica un nombre para el mazo.")
              .max(100),
          })
          .safeParse(payload);
        if (!body.success) {
          return jsonResult({
            ok: false,
            error:
              body.error.issues[0]?.message ?? "Nombre de mazo inválido.",
          });
        }
        const created = createQuickDeck(user.id, body.data.name);
        safeRevalidatePath("/");
        safeRevalidatePath("/grimorio");
        safeRevalidatePath("/ajustes");
        safeRevalidatePath("/lecturas");
        safeRevalidatePath("/lecturas/nueva");
        return jsonResult({
          ok: true,
          data: created,
          message: `Mazo «${created.name}» registrado. Faltan datos que podrás completar desde Inicio.`,
        });
      }

      case "grimorio.updateDeck": {
        const body = z
          .object({
            deckId: z.string().min(1),
            input: deckFormSchema,
          })
          .safeParse(payload);
        if (!body.success) {
          return jsonResult({
            ok: false,
            error: body.error.issues[0]?.message ?? "Revisa los datos del mazo.",
          });
        }
        const updated = updateDeck(user.id, body.data.deckId, body.data.input);
        safeRevalidatePath("/");
        safeRevalidatePath("/grimorio");
        safeRevalidatePath("/ajustes");
        safeRevalidatePath("/lecturas/nueva");
        return jsonResult({
          ok: true,
          data: updated,
          message: `Datos de «${updated.name}» actualizados.`,
        });
      }

      case "grimorio.deleteDeck": {
        const body = z.object({ deckId: z.string().min(1) }).safeParse(payload);
        if (!body.success) {
          return jsonResult({ ok: false, error: "Mazo no válido." });
        }
        deleteDeck(user.id, body.data.deckId);
        safeRevalidatePath("/");
        safeRevalidatePath("/grimorio");
        safeRevalidatePath("/ajustes");
        return jsonResult({
          ok: true,
          data: null,
          message: "Mazo eliminado de tu colección.",
        });
      }

      case "grimorio.createSpread": {
        const parsed = spreadTemplateFormSchema.safeParse(payload);
        if (!parsed.success) {
          return jsonResult({
            ok: false,
            error:
              parsed.error.issues[0]?.message ??
              "Revisa el nombre y las posiciones de la tirada.",
          });
        }
        const created = createSpreadTemplate(user.id, parsed.data);
        safeRevalidatePath("/grimorio");
        safeRevalidatePath("/ajustes");
        safeRevalidatePath("/lecturas/nueva");
        return jsonResult({
          ok: true,
          data: created,
          message: `Estructura «${created.name}» guardada.`,
        });
      }

      case "grimorio.deleteSpread": {
        const body = z.object({ spreadId: z.string().min(1) }).safeParse(payload);
        if (!body.success) {
          return jsonResult({ ok: false, error: "Estructura no válida." });
        }
        deleteSpreadTemplate(user.id, body.data.spreadId);
        safeRevalidatePath("/grimorio");
        safeRevalidatePath("/ajustes");
        return jsonResult({
          ok: true,
          data: null,
          message: "Estructura personalizada eliminada.",
        });
      }

      case "workspace.updateProfile": {
        const parsed = workspaceProfileSchema.safeParse(payload);
        if (!parsed.success) {
          return jsonResult({
            ok: false,
            error:
              parsed.error.issues[0]?.message ??
              "Revisa los campos de configuración.",
          });
        }
        const updated = updateUserWorkspaceProfile(user.id, parsed.data);
        safeRevalidatePath("/", "layout");
        safeRevalidatePath("/ajustes");
        return jsonResult({
          ok: true,
          data: updated,
          message: "Preferencias guardadas.",
        });
      }

      case "workspace.importBackup": {
        const body = z
          .object({ rawJsonText: z.string().min(1) })
          .safeParse(payload);
        if (!body.success) {
          return jsonResult({
            ok: false,
            error: "Selecciona un archivo de respaldo válido.",
          });
        }
        let decoded: unknown;
        try {
          decoded = JSON.parse(body.data.rawJsonText);
        } catch {
          return jsonResult({
            ok: false,
            error: "El archivo seleccionado no contiene un formato JSON válido.",
          });
        }
        const result = importWorkspaceBackup(user.id, decoded);
        safeRevalidatePath("/", "layout");
        return jsonResult({
          ok: true,
          data: result,
          message: `Respaldo recuperado: ${result.importedReadings} lecturas y ${result.importedConsultants} consultantes importados.`,
        });
      }

      default:
        return jsonResult(
          { ok: false, error: `Operación desconocida: ${op}` },
          400
        );
    }
  } catch (err) {
    return jsonResult({
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "No se pudo completar la operación solicitada.",
    });
  }
}
