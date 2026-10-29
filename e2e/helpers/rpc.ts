import type { APIRequestContext } from "@playwright/test";

interface RpcResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Llama a la API RPC interna de la app (`/api/rpc`) usando el cookie jar del
 * `request` fixture. Se usa para sembrar usuarios y datos sin recorrer la UI,
 * manteniendo cada test aislado y rápido.
 */
export async function callRpc<T = unknown>(
  request: APIRequestContext,
  op: string,
  payload: unknown = {}
): Promise<T> {
  const response = await request.post("/api/rpc", {
    data: { op, payload },
  });
  const body = (await response.json()) as RpcResponse<T>;

  if (!response.ok() || !body.ok) {
    throw new Error(
      `RPC "${op}" falló (${response.status()}): ${body.error ?? "sin detalle"}`
    );
  }

  return body.data as T;
}

export interface TestAccount {
  email: string;
  password: string;
  name: string;
  workspaceName: string;
}

const DEFAULT_PASSWORD = "clave-e2e-9876";

export function uniqueEmail(tag: string): string {
  const project = tag.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const random = Math.random().toString(36).slice(2, 8);
  return `e2e-${project}-${Date.now()}-${random}@estudio.local`;
}

/**
 * Registra una cuenta nueva y completa el onboarding. Ambos endpoints emiten
 * cookie de sesión, así que al terminar el `request` fixture ya está
 * autenticado y puede inyectarse en el contexto del navegador.
 */
export async function createIsolatedAccount(
  request: APIRequestContext,
  projectName: string
): Promise<TestAccount> {
  const account: TestAccount = {
    email: uniqueEmail(projectName),
    password: DEFAULT_PASSWORD,
    name: "Elena E2E",
    workspaceName: "Mesa E2E",
  };

  await callRpc(request, "auth.register", {
    name: account.name,
    workspaceName: account.workspaceName,
    email: account.email,
    password: account.password,
  });

  await callRpc(request, "onboarding.complete");

  await createDefaultDeck(request);

  return account;
}

/**
 * Registra una cuenta nueva sin completar el onboarding, para pruebas del
 * flujo guiado real. El cookie de sesión queda en el `request` fixture.
 */
export async function createOnboardingAccount(
  request: APIRequestContext,
  projectName: string
): Promise<TestAccount> {
  const account: TestAccount = {
    email: uniqueEmail(projectName),
    password: DEFAULT_PASSWORD,
    name: "Elena Onboarding E2E",
    workspaceName: "Mesa Onboarding E2E",
  };

  await callRpc(request, "auth.register", {
    name: account.name,
    workspaceName: account.workspaceName,
    email: account.email,
    password: account.password,
  });

  return account;
}

/**
 * Crea un mazo RWS con sus 78 cartas. Las cuentas nuevas no heredan los mazos
 * integrados que se siembran al iniciar el servidor, así que cada cuenta de
 * test recibe el suyo para poder abrir lecturas y el grimorio.
 */
export async function createDefaultDeck(
  request: APIRequestContext,
  overrides: Record<string, unknown> = {}
): Promise<{ id: string }> {
  return callRpc<{ id: string }>(request, "grimorio.createDeck", {
    name: "Mazo E2E",
    tradition: "rws",
    author: "",
    cardCount: 78,
    description: "",
    isDefault: true,
    ...overrides,
  });
}

export async function loginWithApi(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<void> {
  await callRpc(request, "auth.login", { email, password });
}

export interface CreatedConsultant {
  id: string;
  displayName: string;
}

export async function createConsultant(
  request: APIRequestContext,
  overrides: Partial<{
    fullName: string;
    alias: string;
  }> = {}
): Promise<CreatedConsultant> {
  return callRpc<CreatedConsultant>(request, "consultant.create", {
    fullName: "Consultante E2E",
    alias: "E2E",
    email: "",
    phone: "",
    preferredChannel: "",
    contextNotes: "",
    personalNotes: "",
    tags: [],
    ...overrides,
  });
}

export async function createAppointment(
  request: APIRequestContext,
  consultantId: string,
  overrides: Record<string, unknown> = {}
): Promise<{ id: string }> {
  return callRpc<{ id: string }>(request, "appointment.create", {
    consultantId,
    title: "Sesión E2E",
    scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
    hasSpecificDuration: true,
    durationMinutes: 60,
    modality: "in_person",
    status: "scheduled",
    intention: "",
    prepNotes: "",
    ...overrides,
  });
}
