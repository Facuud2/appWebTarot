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
    expect(loginRes.headers.get("set-cookie")).toContain("grimorio_session=");
    const loginData = (await loginRes.json()) as { ok: boolean };
    expect(loginData.ok).toBe(true);
  });
});
