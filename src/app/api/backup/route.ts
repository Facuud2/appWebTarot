import { NextResponse } from "next/server";
import { exportWorkspaceBackup } from "@/repositories/users-repository";
import { getCurrentUser } from "@/server/session";

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401 }
    );
  }

  const backup = await exportWorkspaceBackup(user.id);
  const datePart = new Date().toISOString().slice(0, 10);
  const slug = user.workspaceName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return new NextResponse(JSON.stringify(backup, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mesa-tarot-respaldo-${slug || "mesa"}-${datePart}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
