"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTheme } from "next-themes";
import { useForm, useWatch } from "react-hook-form";
import { Download, LogOut, Monitor, Moon, Save, Sun, Upload } from "lucide-react";
import { toast } from "sonner";
import { logoutAction } from "@/actions/auth-actions";
import {
  importBackupJsonAction,
  updateWorkspaceProfileAction,
} from "@/actions/workspace-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  workspaceProfileSchema,
  type WorkspaceProfileValues,
} from "@/schemas/domain";
import type { Deck, SpreadTemplate, User } from "@/types/domain";

interface SettingsClientProps {
  user: User;
  decks: Deck[];
  spreads: SpreadTemplate[];
}

export function SettingsClient({ user, decks, spreads }: SettingsClientProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [isSaving, startSaving] = React.useTransition();
  const [isImporting, startImporting] = React.useTransition();
  const [loggingOut, setLoggingOut] = React.useState(false);

  const [pendingBackupJson, setPendingBackupJson] = React.useState<
    string | null
  >(null);
  const [pendingBackupFilename, setPendingBackupFilename] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<WorkspaceProfileValues>({
    resolver: zodResolver(workspaceProfileSchema),
    defaultValues: {
      name: user.name,
      workspaceName: user.workspaceName,
      defaultDeckId: user.preferences.defaultDeckId ?? "",
      defaultSpreadId: user.preferences.defaultSpreadId ?? "",
      compactTables: user.preferences.compactTables,
      autosaveReadings: user.preferences.autosaveReadings,
    },
  });

  const compactTables = useWatch({
    control: form.control,
    name: "compactTables",
  });
  const autosaveReadings = useWatch({
    control: form.control,
    name: "autosaveReadings",
  });

  const onSaveProfile = form.handleSubmit((values) => {
    startSaving(async () => {
      const res = await updateWorkspaceProfileAction(values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "Preferencias guardadas.");
      router.refresh();
    });
  });

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setPendingBackupFilename(file.name);
      setPendingBackupJson(text);
    } catch {
      toast.error("No se pudo leer el archivo seleccionado.");
    } finally {
      e.target.value = "";
    }
  };

  const confirmImport = () => {
    if (!pendingBackupJson) return;
    const raw = pendingBackupJson;
    setPendingBackupJson(null);
    startImporting(async () => {
      const res = await importBackupJsonAction(raw);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "Respaldo restaurado correctamente.");
      router.refresh();
    });
  };

  const classicSpreads = React.useMemo(
    () => spreads.filter((sp) => sp.isBuiltin),
    [spreads]
  );

  return (
    <div className="max-w-4xl divide-y divide-border">
      {/* Section 1: Workspace Identity & Defaults */}
      <section className="grid gap-6 py-7 first:pt-0 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-ink">
            Espacio de trabajo y valores iniciales
          </h2>
          <p className="text-xs text-muted leading-relaxed">
            Tu nombre y las opciones seleccionadas por defecto al preparar una nueva lectura.
          </p>
        </div>

        <form
          onSubmit={onSaveProfile}
          className="rounded-xl border border-border bg-ground p-5 space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="settings-name">Tu nombre</Label>
              <Input id="settings-name" {...form.register("name")} />
              {form.formState.errors.name ? (
                <p className="text-xs text-negative">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="settings-workspace">Nombre del espacio</Label>
              <Input
                id="settings-workspace"
                {...form.register("workspaceName")}
              />
              {form.formState.errors.workspaceName ? (
                <p className="text-xs text-negative">
                  {form.formState.errors.workspaceName.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="settings-default-deck">
                Mazo predeterminado
              </Label>
              <select
                id="settings-default-deck"
                className="flex h-10 w-full rounded-lg border border-control bg-raised px-3 text-sm text-ink"
                {...form.register("defaultDeckId")}
              >
                <option value="">Usar el marcado como predeterminado</option>
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="settings-default-spread">
                Estructura de tirada inicial
              </Label>
              <select
                id="settings-default-spread"
                className="flex h-10 w-full rounded-lg border border-control bg-raised px-3 text-sm text-ink"
                {...form.register("defaultSpreadId")}
              >
                <option value="">Pasado, Presente y Futuro (3 cartas)</option>
                {classicSpreads.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <Checkbox
                checked={autosaveReadings}
                onCheckedChange={(v) =>
                  form.setValue("autosaveReadings", v === true, {
                    shouldDirty: true,
                  })
                }
                className="mt-0.5"
              />
              <span className="space-y-0.5">
                <span className="block text-xs font-medium text-ink">
                  Autoguardado durante la lectura
                </span>
                <span className="block text-xs text-muted">
                  Guarda automáticamente tus avances tras una breve pausa al escribir durante una sesión.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <Checkbox
                checked={compactTables}
                onCheckedChange={(v) =>
                  form.setValue("compactTables", v === true, {
                    shouldDirty: true,
                  })
                }
                className="mt-0.5"
              />
              <span className="space-y-0.5">
                <span className="block text-xs font-medium text-ink">
                  Vista compacta en el historial de lecturas
                </span>
                <span className="block text-xs text-muted">
                  Muestra más sesiones por pantalla al revisar listados extensos.
                </span>
              </span>
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-border pt-4">
            <span className="min-w-0 truncate text-xs text-muted">
              Cuenta: {user.email}
            </span>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSaving}
              className="w-full sm:w-auto shrink-0"
            >
              <Save className="size-3.5" aria-hidden="true" />
              <span>{isSaving ? "Guardando…" : "Guardar preferencias"}</span>
            </Button>
          </div>
        </form>
      </section>

      {/* Section 2: Appearance & Calm Reading Mode */}
      <section className="grid gap-6 py-7 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-ink">
            Apariencia y teclado
          </h2>
          <p className="text-xs text-muted leading-relaxed">
            Elige el modo de color que te resulte más cómodo de día o en sesiones con poca luz.
          </p>
        </div>

        <div className="min-w-0 rounded-xl border border-border bg-ground p-4 sm:p-5 space-y-4">
          <div className="space-y-2">
            <Label>Tema de color</Label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "light", label: "Claro", icon: Sun },
                  { id: "dark", label: "Oscuro", icon: Moon },
                  { id: "system", label: "Automático", icon: Monitor },
                ] as const
              ).map((opt) => {
                const Icon = opt.icon;
                const active = mounted && theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTheme(opt.id)}
                    className={cn(
                      "flex min-w-0 items-center justify-center gap-1.5 sm:gap-2 rounded-lg border px-2 sm:px-3 py-2.5 text-xs font-medium transition-colors",
                      active
                        ? "border-ink bg-surface text-ink"
                        : "border-border bg-raised text-muted hover:text-ink"
                    )}
                  >
                    <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-3.5 text-xs text-muted space-y-1">
            <p className="font-medium text-ink">Atajo rápido de buscador</p>
            <p>
              Pulsa <kbd className="rounded border border-border bg-ground px-1.5 py-0.5 font-mono text-[11px] text-ink">⌘K</kbd> o{" "}
              <kbd className="rounded border border-border bg-ground px-1.5 py-0.5 font-mono text-[11px] text-ink">Ctrl+K</kbd>{" "}
              desde cualquier pantalla para buscar al instante una carta, un consultante o una lectura.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3: Portable JSON Backup & Validated Restore */}
      <section className="grid gap-6 py-7 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-ink">
            Copias de seguridad
          </h2>
          <p className="text-xs text-muted leading-relaxed">
            Tus notas de cartas, fichas de consultantes, citas y lecturas pueden exportarse y restaurarse en formato JSON.
          </p>
        </div>

        <div className="min-w-0 rounded-xl border border-border bg-ground p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-ink">
                Exportar copia completa del espacio (.json)
              </p>
              <p className="text-xs text-muted">
                Incluye consultantes, mazos, notas personales, lecturas, cartas y eventos del mazo.
              </p>
            </div>
            <Button asChild variant="secondary" size="sm" className="shrink-0">
              <a href="/api/backup" download>
                <Download className="size-3.5" aria-hidden="true" />
                <span>Descargar respaldo</span>
              </a>
            </Button>
          </div>

          <div className="border-t border-border pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-ink">
                Importar respaldo JSON validado
              </p>
              <p className="text-xs text-muted">
                Restaura o actualiza tus registros desde un archivo de copia de seguridad exportado previamente.
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleFileChosen}
                className="sr-only"
                aria-label="Seleccionar archivo JSON de respaldo"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isImporting}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-3.5" aria-hidden="true" />
                <span>
                  {isImporting ? "Importando…" : "Seleccionar archivo JSON"}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Multiplatform Web / PWA / Desktop Architecture Note */}
      <section className="grid gap-6 py-7 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-ink">
            Instalación en tus dispositivos
          </h2>
          <p className="text-xs text-muted leading-relaxed">
            Uso en teléfono móvil, tablet o computadora.
          </p>
        </div>

        <div className="min-w-0 rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-2 text-xs text-muted leading-relaxed">
          <p className="font-medium text-ink">
            Aplicación Web Instalable (PWA)
          </p>
          <p>
            Puedes instalar esta aplicación en la pantalla de inicio de tu teléfono o en tu navegador mediante «Instalar aplicación» para usarla a pantalla completa sin distracciones durante las sesiones.
          </p>
        </div>
      </section>

      {/* Section 5: Active Session & Account Switch (especially convenient on mobile without sidebar) */}
      <section className="grid gap-6 py-7 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-ink">Sesión activa</h2>
          <p className="text-xs text-muted leading-relaxed">
            Cierra tu sesión actual o cambia entre tu cuenta privada y el espacio de demostración.
          </p>
        </div>

        <div className="min-w-0 rounded-xl border border-border bg-ground p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-0.5">
            <p className="truncate text-sm font-medium text-ink">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={loggingOut}
            onClick={async () => {
              setLoggingOut(true);
              const res = await logoutAction();
              if (res.ok) {
                toast.success("Sesión cerrada.");
                router.replace("/acceso");
                router.refresh();
              } else {
                toast.error(res.error);
                setLoggingOut(false);
              }
            }}
            className="w-full sm:w-auto shrink-0"
          >
            <LogOut className="size-3.5" aria-hidden="true" />
            <span>
              {loggingOut
                ? "Cerrando sesión…"
                : "Cerrar sesión / Cambiar cuenta"}
            </span>
          </Button>
        </div>
      </section>

      <AlertDialog
        open={pendingBackupJson !== null}
        onOpenChange={(open) => {
          if (!open) setPendingBackupJson(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Importar respaldo desde «{pendingBackupFilename}»?
            </AlertDialogTitle>
            <AlertDialogDescription>
              El archivo se validará antes de guardar cualquier cambio. Los registros con el mismo identificador actualizarán su contenido actual en tu espacio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport}>
              Validar e importar respaldo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
