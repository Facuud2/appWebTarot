import { NextRequest, NextResponse } from "next/server";
import { executeGlobalSearch } from "@/repositories/readings-repository";
import { getCurrentUser } from "@/server/session";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q") ?? "";
  const results = executeGlobalSearch(user.id, query);
  return NextResponse.json(results, {
    headers: { "Cache-Control": "no-store" },
  });
}
