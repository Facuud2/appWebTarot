import { callRpc } from "@/lib/rpc-client";
import type { LoginInput, RegisterInput } from "@/schemas/domain";
import type { ActionResult, User } from "@/types/domain";

export async function loginAction(
  input: LoginInput
): Promise<ActionResult<User>> {
  return callRpc<User>("auth.login", input);
}

export async function registerAction(
  input: RegisterInput
): Promise<ActionResult<User>> {
  return callRpc<User>("auth.register", input);
}

export async function enterDemoWorkspaceAction(): Promise<ActionResult<User>> {
  return callRpc<User>("auth.demo");
}

export async function logoutAction(): Promise<ActionResult<null>> {
  return callRpc<null>("auth.logout");
}
