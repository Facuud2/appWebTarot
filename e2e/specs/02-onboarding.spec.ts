import { test, expect } from "../fixtures/test";
import { uniqueEmail } from "../helpers/rpc";

async function selectAndAdvance(
  page: import("@playwright/test").Page,
  radioName: RegExp,
  next: import("@playwright/test").Locator
) {
  const radio = page.getByRole("radio", { name: radioName });
  // `advanceWithSelection` ignora la selección mientras el paso anterior
  // todavía está guardando, así que puede hacer falta reintentar. Pero una vez
  // que la app avanza el radio desaparece: sólo se reintenta mientras siga
  // visible, y se corta en cuanto aparece el contenido del paso siguiente.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (await next.isVisible({ timeout: 1_000 }).catch(() => false)) return;
    if (!(await radio.isVisible().catch(() => false))) {
      await page.waitForTimeout(300);
      continue;
    }
    await radio.click({ timeout: 5_000 }).catch(() => {});
    if (await next.isVisible({ timeout: 2_500 }).catch(() => false)) return;
    await page.waitForTimeout(300);
  }
  await expect(next).toBeVisible();
}

test.describe("Onboarding guiado", () => {
  test("completa las 7 etapas y entra a la mesa", async ({ page }) => {
    await page.goto("/acceso");
    await page.getByRole("tab", { name: /Crear cuenta/i }).click();
    await page.getByLabel(/Tu nombre/i).fill("Elena Onboarding");
    await page
      .getByLabel(/Nombre del consultorio \/ espacio/i)
      .fill("Mesa de Luna");
    await page.getByLabel(/Correo electrónico/i).fill(uniqueEmail("onboarding"));
    await page.getByLabel(/Contraseña nueva/i).fill("clave-segura-9876");
    await page.getByRole("button", { name: /Crear cuenta/i }).click();

    await expect(page).toHaveURL("/onboarding");

    // Paso 1: nivel de experiencia (avanza automáticamente)
    await selectAndAdvance(
      page,
      /Profesional/i,
      page.getByRole("heading", { name: /¿Qué te gustaría hacer/i })
    );

    // Paso 2: finalidades
    await page
      .getByRole("checkbox", { name: /Organizar citas y gestionar consultantes/i })
      .click();
    await page.getByRole("button", { name: /^Siguiente$/i }).click();

    // Paso 3: mazo — seguir explorando (avanza automáticamente)
    await selectAndAdvance(
      page,
      /Todavía estoy explorando/i,
      page.getByRole("button", { name: /Siguiente etapa/i })
    );
    for (let step = 0; step < 4; step += 1) {
      await page.getByRole("button", { name: /Siguiente etapa/i }).click();
    }
    await page
      .getByRole("button", { name: /Continuar a lectura guiada/i })
      .click();

    // Paso 5: tutorial de lectura (destinatario → mesa)
    await page.getByRole("radio", { name: /Para mí/i }).click();
    await page
      .getByRole("button", { name: /Avanzar a mesa de cartas/i })
      .click();
    await page.getByRole("button", { name: /Quizás más tarde/i }).click();

    // Paso 6: instalación de la app
    await expect(
      page.getByRole("heading", { name: /Instala Grimorio en tu dispositivo/i })
    ).toBeVisible();
    await page
      .getByRole("button", { name: /Ahora no, continuar/i })
      .click();

    // Paso 7: resumen
    await expect(
      page.getByRole("button", { name: /Entrar a mi mesa de tarot/i })
    ).toBeVisible();
    await page
      .getByRole("button", { name: /Entrar a mi mesa de tarot/i })
      .click();

    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", { name: /Próximas sesiones/i })
    ).toBeVisible();
  });
});
