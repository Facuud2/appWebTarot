"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteConsultantAction,
  toggleConsultantArchiveAction,
} from "@/actions/consultant-actions";
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
import { Button } from "@/components/ui/button";
import { ConsultantFormDialog } from "@/features/consultants/consultant-form-dialog";
import type { Consultant } from "@/types/domain";

interface ConsultantDossierActionsProps {
  consultant: Consultant;
  tagSuggestions: string[];
}

export function ConsultantDossierActions({
  consultant,
  tagSuggestions,
}: ConsultantDossierActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const handleArchiveToggle = async () => {
    setBusy(true);
    const res = await toggleConsultantArchiveAction(
      consultant.id,
      consultant.archivedAt === null
    );
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(res.message ?? "Estado actualizado.");
    router.refresh();
  };

  const handleDelete = async () => {
    setBusy(true);
    const res = await deleteConsultantAction(consultant.id);
    if (!res.ok) {
      toast.error(res.error);
      setBusy(false);
      return;
    }
    toast.success(res.message ?? "Consultante eliminado.");
    router.push("/consultantes");
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setEditOpen(true)}
      >
        <Pencil className="size-3.5" aria-hidden="true" />
        <span>Editar ficha</span>
      </Button>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={busy}
        onClick={handleArchiveToggle}
      >
        {consultant.archivedAt ? (
          <>
            <ArchiveRestore className="size-3.5" aria-hidden="true" />
            <span>Restaurar</span>
          </>
        ) : (
          <>
            <Archive className="size-3.5" aria-hidden="true" />
            <span>Archivar</span>
          </>
        )}
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="destructive" size="sm" disabled={busy}>
            <Trash2 className="size-3.5" aria-hidden="true" />
            <span>Eliminar</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar la ficha de {consultant.displayName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán su ficha y sus citas asociadas. Las lecturas realizadas con anterioridad se conservarán en tu archivo histórico como lecturas sin consultante asignado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Eliminar ficha
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConsultantFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        consultant={consultant}
        tagSuggestions={tagSuggestions}
      />
    </div>
  );
}
