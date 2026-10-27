// @vitest-environment node
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/rpc/route";
import { listAvailableDecks } from "@/repositories/grimorio-repository";
import { getDemoUser, registerNewUser } from "@/repositories/users-repository";
import { getUserFromToken } from "@/server/session";

describe("onboarding flow and persistence", () => {
  it("initializes newly registered user with incomplete onboarding at step 1", () => {
    const email = `onboarding-init-${Date.now()}@test.org`;
    const user = registerNewUser({
      name: "Camila Tarotista",
      workspaceName: "Mesa de Camila",
      email,
      password: "clave-segura-1234",
    });

    expect(user.preferences.onboarding).toBeDefined();
    expect(user.preferences.onboarding?.completed).toBe(false);
    expect(user.preferences.onboarding?.currentStep).toBe(1);
    expect(user.preferences.onboarding?.experienceLevel).toBeNull();
    expect(user.preferences.onboarding?.usagePurposes).toEqual([]);
    expect(user.preferences.onboarding?.selectedDeckId).toBeNull();
  });

  it("ensures demo user is considered completed by default so workspace is not blocked", () => {
    const demoUser = getDemoUser();
    expect(demoUser.isDemo).toBe(true);
    expect(demoUser.preferences.onboarding?.completed).toBe(true);
  });

  it("persists progressive steps, answers, and deck selection via RPC", async () => {
    const email = `onboarding-rpc-${Date.now()}@test.org`;
    const password = "clave-segura-9876";

    // 1. Registrar usuario
    const regReq = new Request("http://localhost:3000/api/rpc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        op: "auth.register",
        payload: {
          name: "Lucas Onboarding",
          workspaceName: "Mesa de Lucas",
          email,
          password,
        },
      }),
    });

    const regRes = await POST(regReq);
    expect(regRes.status).toBe(200);
    const setCookie = regRes.headers.get("set-cookie") ?? "";
    const tokenMatch = setCookie.match(/grimorio_session=([^;]+)/);
    expect(tokenMatch).not.toBeNull();
    const token = decodeURIComponent(tokenMatch![1]);

    // 2. Guardar Paso 1: Nivel de experiencia
    const step1Req = new Request("http://localhost:3000/api/rpc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `grimorio_session=${token}`,
      },
      body: JSON.stringify({
        op: "onboarding.saveProgress",
        payload: {
          currentStep: 2,
          experienceLevel: "intermediate",
        },
      }),
    });
    const step1Res = await POST(step1Req);
    expect(step1Res.status).toBe(200);
    const step1Json = (await step1Res.json()) as {
      ok: boolean;
      data?: { preferences: { onboarding?: { currentStep: number; experienceLevel: string } } };
    };
    expect(step1Json.ok).toBe(true);
    expect(step1Json.data?.preferences.onboarding?.currentStep).toBe(2);
    expect(step1Json.data?.preferences.onboarding?.experienceLevel).toBe("intermediate");

    // 3. Guardar Paso 2: Propósitos de uso
    const step2Req = new Request("http://localhost:3000/api/rpc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `grimorio_session=${token}`,
      },
      body: JSON.stringify({
        op: "onboarding.saveProgress",
        payload: {
          currentStep: 3,
          usagePurposes: ["record_readings", "study_cards", "create_spreads"],
        },
      }),
    });
    const step2Res = await POST(step2Req);
    expect(step2Res.status).toBe(200);

    // 4. Guardar Paso 3: Mazo seleccionado
    const step3Req = new Request("http://localhost:3000/api/rpc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `grimorio_session=${token}`,
      },
      body: JSON.stringify({
        op: "onboarding.saveProgress",
        payload: {
          currentStep: 4,
          selectedDeckId: "deck-marseille",
        },
      }),
    });
    const step3Res = await POST(step3Req);
    expect(step3Res.status).toBe(200);
    const step3Json = (await step3Res.json()) as {
      ok: boolean;
      data?: {
        preferences: {
          defaultDeckId: string;
          onboarding?: { selectedDeckId: string; currentStep: number };
        };
      };
    };
    expect(step3Json.ok).toBe(true);
    expect(step3Json.data?.preferences.defaultDeckId).toBe("deck-marseille");
    expect(step3Json.data?.preferences.onboarding?.selectedDeckId).toBe("deck-marseille");

    // 5. Omitir Paso 4 (Agenda)
    const step4Req = new Request("http://localhost:3000/api/rpc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `grimorio_session=${token}`,
      },
      body: JSON.stringify({
        op: "onboarding.saveProgress",
        payload: {
          currentStep: 5,
          skippedAppointmentDemo: true,
        },
      }),
    });
    const step4Res = await POST(step4Req);
    expect(step4Res.status).toBe(200);

    // 6. Verificar persistencia recuperando la sesión desde token
    const restored = getUserFromToken(token);
    expect(restored).not.toBeNull();
    expect(restored?.preferences.onboarding?.currentStep).toBe(5);
    expect(restored?.preferences.onboarding?.experienceLevel).toBe("intermediate");
    expect(restored?.preferences.onboarding?.usagePurposes).toContain("record_readings");
    expect(restored?.preferences.onboarding?.skippedAppointmentDemo).toBe(true);
    expect(restored?.preferences.onboarding?.completed).toBe(false);

    // 7. Completar onboarding
    const completeReq = new Request("http://localhost:3000/api/rpc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `grimorio_session=${token}`,
      },
      body: JSON.stringify({
        op: "onboarding.complete",
      }),
    });
    const completeRes = await POST(completeReq);
    expect(completeRes.status).toBe(200);
    const completeJson = (await completeRes.json()) as {
      ok: boolean;
      data?: { preferences: { onboarding?: { completed: boolean; completedAt: string } } };
    };
    expect(completeJson.ok).toBe(true);
    expect(completeJson.data?.preferences.onboarding?.completed).toBe(true);
    expect(completeJson.data?.preferences.onboarding?.completedAt).not.toBeNull();
  });

  it("provides classic catalog decks (Rider, Marsella, Thoth, Lenormand, Living Wheel) for onboarding", () => {
    const user = registerNewUser({
      name: "Tarotista Clásica",
      workspaceName: "Mesa Clásica",
      email: `classic-decks-${Date.now()}@test.org`,
      password: "clave-segura-classic",
    });

    const availableDecks = listAvailableDecks(user.id);
    expect(availableDecks.length).toBeGreaterThanOrEqual(5);

    const traditions = availableDecks.map((d) => d.tradition);
    expect(traditions).toContain("rws");
    expect(traditions).toContain("marseille");
    expect(traditions).toContain("thoth");
    expect(traditions).toContain("lenormand");
    expect(traditions).toContain("living_wheel");

    const names = availableDecks.map((d) => d.name);
    expect(names.some((n) => n.includes("Rider-Waite-Smith"))).toBe(true);
    expect(names.some((n) => n.includes("Marsella"))).toBe(true);
    expect(names.some((n) => n.includes("Thoth"))).toBe(true);
    expect(names.some((n) => n.includes("Lenormand"))).toBe(true);
  });
});
