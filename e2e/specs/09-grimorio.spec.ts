import { test, expect } from "../fixtures/test";

test.describe("Grimorio", () => {
  test("busca una carta en el catálogo y abre su ficha", async ({
    page,
    account,
  }) => {
    void account;

    await page.goto("/grimorio");
    await expect(
      page.getByRole("heading", { name: /Cartas y mazos/i })
    ).toBeVisible();
    await page.waitForTimeout(500);

    const search = page.getByRole("textbox", {
      name: /Buscar carta por nombre, símbolo o palabra clave/i,
    });
    await search.fill("loco");

    const card = page.getByRole("link", { name: /El Loco/i });
    await expect(card).toBeVisible();
    await card.click();

    await expect(page).toHaveURL(/\/grimorio\/.+-el-loco$/);
    await expect(
      page.getByRole("heading", { name: /El Loco/i }).first()
    ).toBeVisible();
  });

  test("filtra por arcanos mayores y muestra el estado vacío", async ({
    page,
    account,
  }) => {
    void account;

    await page.goto("/grimorio");
    await page.waitForTimeout(500);
    const search = page.getByRole("textbox", {
      name: /Buscar carta por nombre, símbolo o palabra clave/i,
    });

    const majorFilter = page.getByRole("button", { name: /Arcanos Mayores/i });
    const card = page.getByRole("link", { name: /El Loco/i });
    // Reintenta por si el primer clic ocurre antes de que React hidrate.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await majorFilter.click();
      if (await card.isVisible({ timeout: 1_500 }).catch(() => false)) break;
    }
    await expect(card).toBeVisible();
    await expect(
      page.getByRole("link", { name: /As de Copas|As de Oros/i })
    ).toHaveCount(0);

    await search.fill("zzzz-no-existe");
    await expect(
      page.getByText(/Ninguna carta coincide con el filtro actual/i)
    ).toBeVisible();

    // El botón de reset puede montarse justo después del re-render que muestra
    // el estado vacío; si el primer clic cae antes de hidratar, reintenta.
    const allCards = page.getByRole("link", { name: /El Loco/i });
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (await allCards.isVisible().catch(() => false)) break;
      const reset = page.getByRole("button", { name: /Ver todas las cartas/i });
      if (await reset.isVisible().catch(() => false)) {
        await reset.click().catch(() => {});
      }
      await page.waitForTimeout(400);
    }
    await expect(allCards).toBeVisible();
  });

  test("lista mazos y estructuras del espacio", async ({ page, account }) => {
    void account;

    await page.goto("/grimorio?tab=mazos");
    await page.waitForTimeout(500);
    await page.getByRole("tab", { name: /Mis mazos/i }).click();
    await expect(page.getByText("Mazo E2E").first()).toBeVisible();

    await page.getByRole("tab", { name: /Estructuras/i }).click();
    await expect(
      page.getByText(/Pasado, Presente y Futuro/i).first()
    ).toBeVisible();
  });
});
