import { test, expect } from "../fixtures/test";
import { uniqueEmail } from "../helpers/rpc";

test.describe("Acceso y sesión @smoke", () => {
  test("abre el espacio de demostración sin credenciales", async ({ page }) => {
    await page.goto("/acceso");

    await expect(
      page.getByRole("heading", {
        name: /Agenda, registro de lecturas y catálogo de cartas/i,
      })
    ).toBeVisible();

    await page.getByRole("button", { name: /Abrir demostración/i }).click();

    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", { name: /Próximas sesiones/i })
    ).toBeVisible();
  });

  test("registra una cuenta nueva y entra al onboarding", async ({ page }) => {
    await page.goto("/acceso");
    await page.getByRole("tab", { name: /Crear cuenta/i }).click();

    const email = uniqueEmail("registro");
    await page.getByLabel(/Tu nombre/i).fill("Elena Vidal");
    await page
      .getByLabel(/Nombre del consultorio \/ espacio/i)
      .fill("Mesa de Cobre");
    await page.getByLabel(/Correo electrónico/i).fill(email);
    await page.getByLabel(/Contraseña nueva/i).fill("clave-segura-9876");
    await page.getByRole("button", { name: /Crear cuenta/i }).click();

    await expect(page).toHaveURL("/onboarding");
    await expect(
      page.getByRole("heading", {
        name: /¿Qué tan familiarizado estás con el tarot\?/i,
      })
    ).toBeVisible();
    await expect(page.getByText("Mesa de Cobre").first()).toBeVisible();
  });

  test("inicia sesión con una cuenta existente", async ({
    page,
    account,
  }) => {
    await page.context().clearCookies();
    await page.goto("/acceso");

    await page.locator("#login-email").fill(account.email);
    await page.locator("#login-password").fill(account.password);
    await page.getByRole("button", { name: /Entrar a mi espacio/i }).click();

    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", { name: /Próximas sesiones/i })
    ).toBeVisible();
  });

  test("rechaza credenciales inválidas sin crear sesión", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/acceso");

    await page.locator("#login-email").fill("nadie@estudio.local");
    await page.locator("#login-password").fill("clave-incorrecta-123");
    await page.getByRole("button", { name: /Entrar a mi espacio/i }).click();

    await expect(
      page.getByText(/Correo o contraseña incorrectos/i)
    ).toBeVisible();
    await expect(page).toHaveURL("/acceso");
  });

  test("valida campos obligatorios del registro", async ({ page }) => {
    await page.goto("/acceso");
    await page.getByRole("tab", { name: /Crear cuenta/i }).click();
    await page.getByRole("button", { name: /Crear cuenta/i }).click();

    await expect(page.getByRole("alert").first()).toBeVisible();
    await expect(page).toHaveURL("/acceso");
  });
});
