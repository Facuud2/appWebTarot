"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  List,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  changeAppointmentStatusAction,
  deleteAppointmentAction,
} from "@/actions/appointment-actions";
import { ConsultantAvatar } from "@/components/shared/consultant-avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppointmentFormDialog } from "@/features/agenda/appointment-form-dialog";
import {
  APPOINTMENT_MODALITY_LABELS,
  APPOINTMENT_STATUS_LABELS,
} from "@/lib/constants";
import {
  cn,
  formatDateLongEs,
  formatDateTimeEs,
  formatTimeEs,
  safeParseDate,
} from "@/lib/utils";
import type {
  Appointment,
  AppointmentStatus,
  Consultant,
} from "@/types/domain";

interface AgendaViewClientProps {
  appointments: Appointment[];
  consultants: Consultant[];
  autoOpenNew?: boolean;
  defaultConsultantId?: string;
  initialNowIso?: string;
}

const WEEKDAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

export function AgendaViewClient({
  appointments,
  consultants,
  autoOpenNew = false,
  defaultConsultantId = "",
  initialNowIso,
}: AgendaViewClientProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = React.useState<"list" | "calendar">("list");
  const [statusFilter, setStatusFilter] = React.useState<
    AppointmentStatus | "all"
  >("all");
  const [dialogOpen, setDialogOpen] = React.useState(autoOpenNew);
  const [editingAppt, setEditingAppt] = React.useState<Appointment | null>(
    null
  );
  const [isPending, startTransition] = React.useTransition();

  const resolvedNowIso = initialNowIso ?? "2026-10-25T12:00:00.000Z";

  // Monthly calendar state
  const [currentMonth, setCurrentMonth] = React.useState<Date>(() =>
    startOfMonth(safeParseDate(resolvedNowIso))
  );
  const [selectedDay, setSelectedDay] = React.useState<Date>(() =>
    safeParseDate(resolvedNowIso)
  );

  const filteredAppointments = React.useMemo(() => {
    if (statusFilter === "all") return appointments;
    return appointments.filter((a) => a.status === statusFilter);
  }, [appointments, statusFilter]);

  const nowIso = resolvedNowIso;

  const upcomingList = React.useMemo(
    () =>
      filteredAppointments.filter(
        (a) => a.status === "scheduled" && a.scheduledAt >= nowIso
      ),
    [filteredAppointments, nowIso]
  );

  const pastOrClosedList = React.useMemo(
    () =>
      filteredAppointments
        .filter((a) => !(a.status === "scheduled" && a.scheduledAt >= nowIso))
        .slice()
        .reverse(),
    [filteredAppointments, nowIso]
  );

  const calendarDays = React.useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const appointmentsForSelectedDay = React.useMemo(
    () =>
      appointments.filter((appt) =>
        isSameDay(safeParseDate(appt.scheduledAt), selectedDay)
      ),
    [appointments, selectedDay]
  );

  const handleStatusChange = (
    appointmentId: string,
    nextStatus: AppointmentStatus
  ) => {
    startTransition(async () => {
      const res = await changeAppointmentStatusAction(
        appointmentId,
        nextStatus
      );
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "Estado actualizado.");
      router.refresh();
    });
  };

  const handleDelete = (appointmentId: string) => {
    startTransition(async () => {
      const res = await deleteAppointmentAction(appointmentId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "Cita eliminada.");
      router.refresh();
    });
  };

  const renderAppointmentCard = (appt: Appointment, compact = false) => {
    const badgeVariant =
      appt.status === "completed"
        ? "positive"
        : appt.status === "cancelled"
          ? "negative"
          : "warning";

    return (
      <article
        key={appt.id}
        className={cn(
          "t-card-interactive rounded-xl border border-border bg-ground p-4 sm:p-5 flex flex-col gap-4",
          compact
            ? "space-y-1"
            : "lg:flex-row lg:items-start lg:justify-between"
        )}
      >
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex items-start gap-2.5">
            <ConsultantAvatar
              name={appt.consultantDisplayName}
              hue={appt.consultantHue}
              size="sm"
              className="shrink-0 mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-ink break-words">
                  {appt.title}
                </h3>
                <Badge variant={badgeVariant}>
                  {APPOINTMENT_STATUS_LABELS[appt.status]}
                </Badge>
              </div>
              <p className="text-xs text-muted mt-0.5">
                <Link
                  href={`/consultantes/${appt.consultantId}`}
                  className="font-medium text-ink hover:text-accent"
                >
                  {appt.consultantDisplayName}
                </Link>{" "}
                · {APPOINTMENT_MODALITY_LABELS[appt.modality]}
                {appt.durationMinutes !== null ? (
                  <>
                    {" "}
                    ·{" "}
                    <span className="num-tabular">
                      {appt.durationMinutes} min
                    </span>
                  </>
                ) : null}
              </p>
            </div>
          </div>

          {appt.intention ? (
            <p className="text-xs text-ink leading-relaxed break-words">
              <span className="text-muted">Intención: </span>
              {appt.intention}
            </p>
          ) : null}

          {appt.prepNotes ? (
            <p className="text-xs text-muted leading-relaxed break-words">
              Notas previas: {appt.prepNotes}
            </p>
          ) : null}
        </div>

        <div
          className={cn(
            "flex gap-2.5",
            compact
              ? "flex-col sm:flex-row sm:items-center sm:justify-between border-t border-border/80 pt-3"
              : "flex-col sm:items-end shrink-0"
          )}
        >
          <time
            dateTime={appt.scheduledAt}
            suppressHydrationWarning
            className="text-xs font-medium text-ink num-tabular"
          >
            {formatDateTimeEs(appt.scheduledAt)}
          </time>

          <div className="flex flex-wrap items-center gap-1.5">
            {appt.linkedReadingId ? (
              <Button asChild size="sm" variant="secondary">
                <Link href={`/lecturas/${appt.linkedReadingId}`}>
                  Abrir lectura vinculada
                </Link>
              </Button>
            ) : appt.status !== "cancelled" ? (
              <Button asChild size="sm" variant="primary">
                <Link
                  href={`/lecturas/nueva?consultantId=${encodeURIComponent(appt.consultantId)}&appointmentId=${encodeURIComponent(appt.id)}&intention=${encodeURIComponent(appt.intention || appt.title)}`}
                >
                  Iniciar lectura
                </Link>
              </Button>
            ) : null}

            {appt.status === "scheduled" ? (
              <Button
                type="button"
                size="sm"
                variant="tonal"
                disabled={isPending}
                onClick={() => handleStatusChange(appt.id, "completed")}
                title="Marcar sesión como realizada"
              >
                <Check className="size-3.5" aria-hidden="true" />
                <span>Realizada</span>
              </Button>
            ) : null}

            {appt.status === "scheduled" ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleStatusChange(appt.id, "cancelled")}
                aria-label="Cancelar sesión"
                title="Marcar como cancelada"
                className="rounded-lg border border-border bg-raised p-2 text-muted hover:text-warning"
              >
                <XCircle className="size-4" aria-hidden="true" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setEditingAppt(appt);
                setDialogOpen(true);
              }}
              aria-label={`Editar sesión ${appt.title}`}
              className="rounded-lg border border-border bg-raised p-2 text-muted hover:text-ink"
            >
              <Edit3 className="size-4" aria-hidden="true" />
            </button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  aria-label={`Eliminar sesión ${appt.title}`}
                  className="rounded-lg border border-border bg-raised p-2 text-muted hover:text-negative"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    ¿Eliminar esta cita de tu agenda?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Se eliminará la cita «{appt.title}» con {appt.consultantDisplayName}. Si ya tenía una lectura registrada, el registro de esa lectura no se borrará.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(appt.id)}>
                    Eliminar cita
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3.5 sm:p-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Modo de visualización de agenda"
            className="inline-flex max-w-full overflow-x-auto rounded-lg border border-control bg-raised p-0.5 h-10"
          >
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 sm:px-3 text-xs font-medium transition-colors",
                viewMode === "list"
                  ? "bg-surface text-ink border border-border"
                  : "text-muted hover:text-ink"
              )}
            >
              <List className="size-3.5" aria-hidden="true" />
              <span>Cronológica</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 sm:px-3 text-xs font-medium transition-colors",
                viewMode === "calendar"
                  ? "bg-surface text-ink border border-border"
                  : "text-muted hover:text-ink"
              )}
            >
              <CalendarIcon className="size-3.5" aria-hidden="true" />
              <span>Calendario mensual</span>
            </button>
          </div>

          {viewMode === "list" ? (
            <select
              aria-label="Filtrar citas por estado"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as AppointmentStatus | "all")
              }
              className="h-10 max-w-full rounded-lg border border-control bg-raised px-3 text-xs text-ink"
            >
              <option value="all">Todos los estados</option>
              <option value="scheduled">Programadas</option>
              <option value="completed">Realizadas</option>
              <option value="cancelled">Canceladas</option>
            </select>
          ) : null}
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={() => {
            setEditingAppt(null);
            setDialogOpen(true);
          }}
        >
          <CalendarPlus className="size-4" aria-hidden="true" />
          <span>Agendar sesión</span>
        </Button>
      </div>

      {viewMode === "list" ? (
        <div className="space-y-8">
          <section aria-labelledby="heading-proximas" className="space-y-3">
            <h2 id="heading-proximas" className="text-sm font-semibold text-ink">
              Próximas sesiones programadas ({upcomingList.length})
            </h2>

            {upcomingList.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 text-center space-y-3">
                <CalendarPlus className="mx-auto size-6 text-muted" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-ink">
                    Agenda tu próxima sesión
                  </p>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    Programa un encuentro con un consultante, define la modalidad y deja preparada su intención de lectura.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingAppt(null);
                    setDialogOpen(true);
                  }}
                >
                  <CalendarPlus className="size-3.5" aria-hidden="true" />
                  <span>Agendar sesión</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingList.map((a) => renderAppointmentCard(a, false))}
              </div>
            )}
          </section>

          {pastOrClosedList.length > 0 ? (
            <section aria-labelledby="heading-pasadas" className="space-y-3">
              <h2
                id="heading-pasadas"
                className="text-sm font-semibold text-ink"
              >
                Sesiones anteriores, realizadas o canceladas ({pastOrClosedList.length})
              </h2>
              <div className="space-y-3">
                {pastOrClosedList.map((a) => renderAppointmentCard(a, false))}
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        /* Monthly Calendar Grid */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          <section className="min-w-0 lg:col-span-7 rounded-xl border border-border bg-ground p-3.5 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2
                suppressHydrationWarning
                className="min-w-0 truncate font-serif text-xl capitalize text-ink"
              >
                {format(currentMonth, "MMMM yyyy", { locale: es })}
              </h2>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                  aria-label="Mes anterior"
                  className="rounded-lg border border-border bg-raised p-2 text-muted hover:text-ink"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    setCurrentMonth(startOfMonth(today));
                    setSelectedDay(today);
                  }}
                  className="rounded-lg border border-border bg-raised px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-surface"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                  aria-label="Mes siguiente"
                  className="rounded-lg border border-border bg-raised p-2 text-muted hover:text-ink"
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] sm:text-xs font-medium text-muted">
              {WEEKDAYS_ES.map((dayName) => (
                <div key={dayName} className="py-1 truncate">
                  {dayName}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const inMonth = isSameMonth(day, currentMonth);
                const selected = isSameDay(day, selectedDay);
                const dayAppts = appointments.filter((a) =>
                  isSameDay(safeParseDate(a.scheduledAt), day)
                );

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "min-h-14 sm:min-h-16 min-w-0 overflow-hidden rounded-lg border p-1 sm:p-1.5 flex flex-col justify-between text-left transition-colors",
                      selected
                        ? "border-accent bg-active"
                        : "border-border bg-surface/50 hover:bg-surface",
                      !inMonth && "opacity-40"
                    )}
                  >
                    <span className="text-xs font-medium text-ink num-tabular">
                      {format(day, "d")}
                    </span>

                    {dayAppts.length > 0 ? (
                      <div className="min-w-0 w-full space-y-0.5">
                        {dayAppts.slice(0, 2).map((da) => (
                          <span
                            key={da.id}
                            className="block truncate rounded bg-ground px-1 py-0.5 text-[10px] text-ink num-tabular border border-border"
                          >
                            {formatTimeEs(da.scheduledAt)} {da.consultantDisplayName}
                          </span>
                        ))}
                        {dayAppts.length > 2 ? (
                          <span className="block truncate text-[10px] text-muted num-tabular">
                            +{dayAppts.length - 2} más
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="min-w-0 lg:col-span-5 rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4">
            <h3 suppressHydrationWarning className="text-sm font-semibold text-ink">
              Sesiones del {formatDateLongEs(selectedDay.toISOString())}
            </h3>

            {appointmentsForSelectedDay.length === 0 ? (
              <div className="rounded-xl border border-border bg-ground p-6 text-center space-y-3">
                <CalendarPlus className="mx-auto size-6 text-muted" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-ink">
                    Sin sesiones para este día
                  </p>
                  <p className="text-xs text-muted leading-relaxed max-w-xs mx-auto">
                    Agenda tu próxima sesión para el {formatDateLongEs(selectedDay.toISOString())}.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setEditingAppt(null);
                    setDialogOpen(true);
                  }}
                >
                  <CalendarPlus className="size-3.5" aria-hidden="true" />
                  <span>Agendar en este día</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {appointmentsForSelectedDay.map((a) => renderAppointmentCard(a, true))}
              </div>
            )}
          </aside>
        </div>
      )}

      <AppointmentFormDialog
        open={dialogOpen}
        onOpenChange={(next) => {
          setDialogOpen(next);
          if (!next) setEditingAppt(null);
        }}
        consultants={consultants}
        appointment={editingAppt}
        defaultConsultantId={defaultConsultantId}
      />
    </div>
  );
}
