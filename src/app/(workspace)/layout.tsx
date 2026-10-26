import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { getDashboardSnapshot } from "@/repositories/readings-repository";
import { requireUser } from "@/server/session";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const snapshot = getDashboardSnapshot(user.id);

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
