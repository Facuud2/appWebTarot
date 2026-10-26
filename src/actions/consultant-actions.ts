import { callRpc } from "@/lib/rpc-client";
import type { ConsultantFormValues } from "@/schemas/domain";
import type { ActionResult, Consultant } from "@/types/domain";

export async function createConsultantAction(
  input: ConsultantFormValues
): Promise<ActionResult<Consultant>> {
  return callRpc<Consultant>("consultant.create", input);
}

export async function updateConsultantAction(
  consultantId: string,
  input: ConsultantFormValues
): Promise<ActionResult<Consultant>> {
  return callRpc<Consultant>("consultant.update", { consultantId, input });
}

export async function toggleConsultantArchiveAction(
  consultantId: string,
  archived: boolean
): Promise<ActionResult<Consultant>> {
  return callRpc<Consultant>("consultant.toggleArchive", {
    consultantId,
    archived,
  });
}

export async function deleteConsultantAction(
  consultantId: string
): Promise<ActionResult<null>> {
  return callRpc<null>("consultant.delete", { consultantId });
}
