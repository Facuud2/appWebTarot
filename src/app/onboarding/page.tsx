import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";
import { listConsultants } from "@/repositories/consultants-repository";
import {
  listAvailableDecks,
  listCanonicalCards,
  listSpreadTemplates,
} from "@/repositories/grimorio-repository";
import { requireUser } from "@/server/session";

export const metadata: Metadata = {
  title: "Bienvenido a Grimorio Tarot · Tutorial inicial",
  description:
    "Configura tus preferencias, conoce las herramientas esenciales y prepara tu mesa de trabajo.",
};

export default async function OnboardingPage(props: {
  searchParams: Promise<{ repaso?: string }>;
}) {
  const user = await requireUser();
  const searchParams = await props.searchParams;
  const isReviewMode = searchParams.repaso === "1";

  if (!isReviewMode && user.preferences.onboarding?.completed) {
    redirect("/");
  }

  const decks = listAvailableDecks(user.id);
  const canonicalCards = listCanonicalCards();
  const spreads = listSpreadTemplates(user.id);
  const consultants = listConsultants(user.id);

  return (
    <OnboardingWizard
      user={user}
      initialDecks={decks}
      canonicalCards={canonicalCards}
      spreads={spreads}
      initialConsultants={consultants}
      isReviewMode={isReviewMode}
    />
  );
}
