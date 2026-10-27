import * as React from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getDashboardSnapshot } from "@/repositories/readings-repository";
import { requireUser } from "@/server/session";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  if (!user.isDemo && !user.preferences.onboarding?.completed) {
    redirect("/onboarding");
  }

  const snapshot = await getDashboardSnapshot(user.id);

  return (
    <AppShell
      user={user}
      draftReadingsCount={snapshot.counts.draftReadings}
      todayAppointmentsCount={snapshot.todayAppointments.length}
    >
      {children}
    </AppShell>
  );
}
