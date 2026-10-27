// @vitest-environment node
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/rpc/route";

describe("auth flow test", () => {
  it("tests auth.demo route handler sets session cookie and returns user", async () => {
    const req = new Request("http://localhost:3000/api/rpc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "auth.demo" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("grimorio_session=");
    const data = (await res.json()) as { ok: boolean; data?: { id: string } };
    expect(data.ok).toBe(true);
    expect(data.data?.id).toBe("user-demo-clara");
  });

  it("tests auth.register and auth.login set session cookies", async () => {
    const email = `test-${Date.now()}@tarot.org`;
    const password = "clave-super-segura-123";

    const registerReq = new Request("http://localhost:3000/api/rpc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        op: "auth.register",
        payload: {
          name: "Valeria Tarot",
          workspaceName: "",
          email,
          password,
        },
      }),
    });

    const registerRes = await POST(registerReq);
    expect(registerRes.status).toBe(200);
    expect(registerRes.headers.get("set-cookie")).toContain("grimorio_session=");
    const regData = (await registerRes.json()) as { ok: boolean; data?: { name: string; workspaceName: string } };
    expect(regData.ok).toBe(true);
    expect(regData.data?.name).toBe("Valeria Tarot");
    expect(regData.data?.workspaceName).toBe("Mesa de Valeria Tarot");

    // Login with the newly registered user
    const loginReq = new Request("http://localhost:3000/api/rpc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        op: "auth.login",
        payload: {
          email,
          password,
        },
      }),
    });

    const loginRes = await POST(loginReq);
    expect(loginRes.status).toBe(200);
    const setCookie = loginRes.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("grimorio_session=");
    const loginData = (await loginRes.json()) as { ok: boolean };
    expect(loginData.ok).toBe(true);

    // Extract token from Set-Cookie and verify getUserFromToken
    const tokenMatch = setCookie.match(/grimorio_session=([^;]+)/);
    expect(tokenMatch).not.toBeNull();
    const token = decodeURIComponent(tokenMatch![1]);

    const { getUserFromToken } = await import("@/server/session");
    const restoredUser = getUserFromToken(token);
    expect(restoredUser).not.toBeNull();
    expect(restoredUser?.email).toBe(email);
    expect(restoredUser?.name).toBe("Valeria Tarot");

    // Test that an authenticated RPC call succeeds with this cookie
    const authReq = new Request("http://localhost:3000/api/rpc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `grimorio_session=${token}`,
      },
      body: JSON.stringify({
        op: "consultant.create",
        payload: {
          fullName: "Lucía Consultant",
          alias: "Lu",
          email: "lucia@test.com",
          phone: "",
          preferredChannel: "",
          contextNotes: "",
          personalNotes: "",
          tags: [],
        },
      }),
    });
    const authRes = await POST(authReq);
    expect(authRes.status).toBe(200);
    const authData = (await authRes.json()) as { ok: boolean };
    expect(authData.ok).toBe(true);
  });

  it("verifies demo workspace data is fully populated in memory (visual) and never stored in the persistent database", async () => {
    const { DEMO_USER_ID, getDb } = await import("@/server/db");
    const { listConsultants } = await import("@/repositories/consultants-repository");
    const { listAppointments } = await import("@/repositories/appointments-repository");
    const { listReadings, getDashboardSnapshot } = await import("@/repositories/readings-repository");

    // 1. In-memory demo data is available and rich for the user to try the app
    const consultants = listConsultants(DEMO_USER_ID);
    expect(consultants.length).toBeGreaterThanOrEqual(3);
    const consultantNames = consultants.map((c) => c.fullName);
    expect(consultantNames).toContain("Mariana Echeverría");
    expect(consultantNames).toContain("Julián Santamaría");

    const appointments = listAppointments(DEMO_USER_ID);
    expect(appointments.length).toBeGreaterThanOrEqual(3);

    const readings = listReadings(DEMO_USER_ID);
    expect(readings.length).toBeGreaterThanOrEqual(2);

    const snapshot = getDashboardSnapshot(DEMO_USER_ID);
    expect(snapshot.counts.completedReadings).toBeGreaterThanOrEqual(2);

    // 2. Persistent SQLite DB on disk has ZERO demo records
    const diskDb = getDb();
    const demoUserInDisk = diskDb
      .prepare("SELECT id FROM users WHERE id = ? OR is_demo = 1")
      .get(DEMO_USER_ID);
    expect(demoUserInDisk).toBeUndefined();

    const demoConsultantsInDisk = diskDb
      .prepare("SELECT count(*) as c FROM consultants WHERE user_id = ?")
      .get(DEMO_USER_ID) as { c: number };
    expect(demoConsultantsInDisk.c).toBe(0);

    const demoReadingsInDisk = diskDb
      .prepare("SELECT count(*) as c FROM readings WHERE user_id = ?")
      .get(DEMO_USER_ID) as { c: number };
    expect(demoReadingsInDisk.c).toBe(0);

    const demoAppointmentsInDisk = diskDb
      .prepare("SELECT count(*) as c FROM appointments WHERE user_id = ?")
      .get(DEMO_USER_ID) as { c: number };
    expect(demoAppointmentsInDisk.c).toBe(0);
  });
});
