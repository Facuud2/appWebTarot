"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  createConsultantAction,
  updateConsultantAction,
} from "@/actions/consultant-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/ui/tag-input";
import { Textarea } from "@/components/ui/textarea";
import {
  consultantFormSchema,
  type ConsultantFormValues,
} from "@/schemas/domain";
import type { Consultant } from "@/types/domain";

interface ConsultantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultant?: Consultant | null;
  tagSuggestions?: string[];
}

export function ConsultantFormDialog({
  open,
  onOpenChange,
  consultant,
  tagSuggestions = [],
}: ConsultantFormDialogProps) {
  const router = useRouter();
  const isEditing = Boolean(consultant);

  const form = useForm<ConsultantFormValues>({
    resolver: zodResolver(consultantFormSchema),
    mode: "onBlur",
    defaultValues: {
      fullName: consultant?.fullName ?? "",
      alias: consultant?.alias ?? "",
      email: consultant?.email ?? "",
      phone: consultant?.phone ?? "",
      preferredChannel: consultant?.preferredChannel ?? "",
      contextNotes: consultant?.contextNotes ?? "",
      personalNotes: consultant?.personalNotes ?? "",
      tags: consultant?.tags.map((t) => t.name) ?? [],
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        fullName: consultant?.fullName ?? "",
        alias: consultant?.alias ?? "",
        email: consultant?.email ?? "",
        phone: consultant?.phone ?? "",
        preferredChannel: consultant?.preferredChannel ?? "",
        contextNotes: consultant?.contextNotes ?? "",
        personalNotes: consultant?.personalNotes ?? "",
        tags: consultant?.tags.map((t) => t.name) ?? [],
      });
    }
  }, [open, consultant, form]);

  const onSubmit = async (values: ConsultantFormValues) => {
    const res = consultant
      ? await updateConsultantAction(consultant.id, values)
      : await createConsultantAction(values);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    toast.success(
      res.message ??
        (isEditing ? "Ficha actualizada." : "Consultante registrado.")
    );
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? `Editar ficha de ${consultant?.displayName}`
              : "Registrar consultante"}
          </DialogTitle>
          <DialogDescription>
            Puedes trabajar únicamente con un nombre o alias. Todos los datos de contacto son opcionales para proteger la privacidad.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cons-fullName" requiredIndicator>
                Nombre o identificador
              </Label>
              <Input
                id="cons-fullName"
                placeholder="Ej. Ana Medina o Alias Sur"
                aria-invalid={Boolean(form.formState.errors.fullName)}
                {...form.register("fullName")}
              />
              {form.formState.errors.fullName ? (
                <p role="alert" className="text-xs text-negative">
                  {form.formState.errors.fullName.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cons-alias">Alias o apodo (opcional)</Label>
              <Input
                id="cons-alias"
                placeholder="Opcional · se prioriza en listas"
                autoCapitalize="none"
                {...form.register("alias")}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="cons-email">Correo (opcional)</Label>
              <Input
                id="cons-email"
                type="email"
                placeholder="correo@ejemplo.org"
                aria-invalid={Boolean(form.formState.errors.email)}
                {...form.register("email")}
              />
              {form.formState.errors.email ? (
                <p role="alert" className="text-xs text-negative">
                  {form.formState.errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cons-phone">Teléfono (opcional)</Label>
              <Input
                id="cons-phone"
                type="tel"
                placeholder="+54 ..."
                {...form.register("phone")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cons-channel">Modalidad habitual</Label>
              <Input
                id="cons-channel"
                placeholder="Presencial, audio…"
                {...form.register("preferredChannel")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cons-context">Contexto vital o motivo general</Label>
            <Textarea
              id="cons-context"
              rows={3}
              placeholder="Procesos, temas habituales o marco que ayuda a situar futuras lecturas…"
              {...form.register("contextNotes")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cons-notes">Notas de acompañamiento en mesa</Label>
            <Textarea
              id="cons-notes"
              rows={2}
              placeholder="Ritmo de sesión preferido, mazos con los que conecta mejor, acuerdos…"
              {...form.register("personalNotes")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cons-tags">Etiquetas personalizadas</Label>
            <Controller
              control={form.control}
              name="tags"
              render={({ field }) => (
                <TagInput
                  id="cons-tags"
                  value={field.value}
                  onChange={field.onChange}
                  suggestions={tagSuggestions}
                  placeholder="Añade etiqueta (ej. Trimestral, Vocación)…"
                />
              )}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? "Guardando…"
                : isEditing
                  ? "Guardar cambios"
                  : "Crear ficha"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
