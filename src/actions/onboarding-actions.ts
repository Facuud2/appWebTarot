import { callRpc } from "@/lib/rpc-client";
import type { OnboardingProgressInput } from "@/schemas/domain";
import type { ActionResult, User } from "@/types/domain";

export async function saveOnboardingProgressAction(
  input: OnboardingProgressInput
): Promise<ActionResult<User>> {
  return callRpc<User>("onboarding.saveProgress", input);
}

export async function completeOnboardingAction(): Promise<ActionResult<User>> {
  return callRpc<User>("onboarding.complete");
}

export async function resetOnboardingAction(): Promise<ActionResult<User>> {
  return callRpc<User>("onboarding.reset");
}
