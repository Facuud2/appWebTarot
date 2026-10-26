import { callRpc } from "@/lib/rpc-client";
import type { WorkspaceProfileValues } from "@/schemas/domain";
import type { ActionResult, User } from "@/types/domain";

export async function updateWorkspaceProfileAction(
  input: WorkspaceProfileValues
): Promise<ActionResult<User>> {
  return callRpc<User>("workspace.updateProfile", input);
}

export async function importBackupJsonAction(
  rawJsonText: string
): Promise<
  ActionResult<{ importedReadings: number; importedConsultants: number }>
> {
  return callRpc<{ importedReadings: number; importedConsultants: number }>(
    "workspace.importBackup",
    { rawJsonText }
  );
}
