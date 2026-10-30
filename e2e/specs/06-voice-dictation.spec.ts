import { test, expect } from "../fixtures/test";
import {
  emitSpeech,
  emitSpeechError,
  expectedOs,
  getLastRecognition,
  mockMicrophone,
  mockSpeechRecognition,
  setMicrophoneLevel,
} from "../fixtures/device";

async function openStepOne(page: import("@playwright/test").Page) {
  await page.goto("/lecturas/nueva");
  await expect(
    page.getByRole("heading", { name: /Paso 1: Configuración y Estructura/i })
  ).toBeVisible();
  // Da tiempo a que React hidrate los handlers del dictado.
  await page.waitForTimeout(500);
}

async function barScale(bar: import("@playwright/test").Locator) {
  return bar.evaluate((element) => {
    const transform = (element as HTMLElement).style.transform;
    const match = /scaleY\(([\d.]+)\)/.exec(transform);
    return match ? Number(match[1]) : 0;
  });
}

test.describe("Dictado por voz @device", () => {
  test("activa el micrófono con el modo continuo de cada plataforma", async ({
    page,
    account,
  }, testInfo) => {
    void account;
    await mockSpeechRecognition(page);
    await mockMicrophone(page);
    await openStepOne(page);

    await page
      .getByRole("button", { name: /Iniciar dictado por voz/i })
      .first()
      .click();

    await expect(
      page.getByRole("button", { name: /Detener dictado por voz/i }).first()
    ).toBeVisible();
    await expect(page.getByText("Escuchando…").first()).toBeVisible();

    const recognition = await getLastRecognition(page);
    expect(recognition).not.toBeNull();
    expect(recognition?.lang).toBe("es-AR");
    // Android reinicia el reconocimiento en cada frase; iOS y desktop usan
    // una sesión continua.
    expect(recognition?.continuous).toBe(
      expectedOs(testInfo.project.name) !== "android"
    );
  });

  test("el campo se convierte en ondas que suben sólo cuando hay audio", async ({
    page,
    account,
  }) => {
    void account;
    await mockSpeechRecognition(page);
    await mockMicrophone(page, 0);
    await openStepOne(page);

    const question = page.getByLabel(/Pregunta o tema de la consulta/i);
    await page
      .getByRole("button", { name: /Iniciar dictado por voz/i })
      .first()
      .click();

    // El cuadro de texto se reemplaza por la superficie de ondas.
    const surface = page
      .getByRole("group", { name: "Dictado en curso" })
      .first();
    await expect(surface).toBeVisible();
    await expect(question).toHaveCount(0);

    const bar = surface.locator(".voice-live-bar").nth(12);
    // Sin audio las barras quedan en el piso.
    await expect.poll(() => barScale(bar)).toBeLessThan(0.1);

    // Con voz suben: no es una animación en bucle.
    await setMicrophoneLevel(page, 1);
    await expect.poll(() => barScale(bar)).toBeGreaterThan(0.6);

    // Al volver el silencio, bajan otra vez.
    await setMicrophoneLevel(page, 0);
    await expect.poll(() => barScale(bar)).toBeLessThan(0.1);
  });

  test("vuelca la transcripción final en la pregunta al detener el dictado", async ({
    page,
    account,
  }) => {
    void account;
    await mockSpeechRecognition(page);
    await mockMicrophone(page);
    await openStepOne(page);

    const question = page.getByLabel(/Pregunta o tema de la consulta/i);
    await page
      .getByRole("button", { name: /Iniciar dictado por voz/i })
      .first()
      .click();

    await expect(question).toHaveCount(0);
    await emitSpeech(page, "el loco");

    await page
      .getByRole("button", { name: /Detener dictado por voz/i })
      .first()
      .click();
    await expect(question).toHaveValue(/El Loco/);
    await expect(
      page.getByRole("button", { name: /Iniciar dictado por voz/i }).first()
    ).toBeVisible();
  });

  test("muestra el error cuando el navegador niega el micrófono", async ({
    page,
    account,
  }) => {
    void account;
    await mockSpeechRecognition(page);
    await mockMicrophone(page);
    await openStepOne(page);

    await page
      .getByRole("button", { name: /Iniciar dictado por voz/i })
      .first()
      .click();
    await expect(
      page.getByRole("button", { name: /Detener dictado por voz/i }).first()
    ).toBeVisible();

    await emitSpeechError(page, "not-allowed");

    await expect(
      page.getByText(/El navegador no tiene permiso para usar el micrófono/i)
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Iniciar dictado por voz/i }).first()
    ).toBeVisible();
  });

  test("cambia de campo y sigue dictando en el nuevo", async ({
    page,
    account,
  }) => {
    void account;
    await mockSpeechRecognition(page);
    await mockMicrophone(page);
    await openStepOne(page);

    const question = page.getByLabel(/Pregunta o tema de la consulta/i);
    const context = page.getByLabel(/Notas previas \/ Contexto/i);

    await page
      .getByRole("button", { name: /Iniciar dictado por voz/i })
      .first()
      .click();
    await emitSpeech(page, "el loco");

    // Cambia de campo sin detener el dictado: la segunda sesión toma el relevo
    // y sólo queda un micrófono activo.
    await page
      .getByRole("button", { name: /dictado por voz/i })
      .nth(1)
      .click();
    await expect(
      page.getByRole("button", { name: /Detener dictado por voz/i })
    ).toHaveCount(1);

    await emitSpeech(page, "la emperatriz");
    await page
      .getByRole("button", { name: /Detener dictado por voz/i })
      .first()
      .click();
    await expect(context).toHaveValue(/La Emperatriz/);
    // El texto del primer campo no se contamina.
    await expect(question).toHaveValue(/El Loco/);

    // Detener y volver a empezar en el primer campo también funciona.
    await page
      .getByRole("button", { name: /Iniciar dictado por voz/i })
      .first()
      .click();
    await emitSpeech(page, "el sol");
    await page
      .getByRole("button", { name: /Detener dictado por voz/i })
      .first()
      .click();
    await expect(question).toHaveValue(/El Loco.*el sol/i);
  });
});
