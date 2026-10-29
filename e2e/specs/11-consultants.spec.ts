import { test, expect } from "../fixtures/test";

test.describe("Consultantes", () => {
  test("crea una ficha desde el directorio y la busca", async ({
    page,
    account,
  }) => {
    void account;

    await page.goto("/consultantes?nuevo=1");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog
      .getByLabel(/Nombre o identificador/i)
      .fill("Consultante Bosque");
    await dialog.getByLabel(/Alias o apodo/i).fill("Bosque");
    await dialog.getByRole("button", { name: /Crear ficha/i }).click();

    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole("link", { name: /Bosque/i }).first()
    ).toBeVisible();

    const search = page.getByRole("textbox", { name: /Buscar consultantes/i });
    await search.fill("Bosque");
    await expect(
      page.getByRole("link", { name: /Bosque/i }).first()
    ).toBeVisible();

    await search.fill("ZZZ sin resultados");
    await page.getByRole("button", { name: /^Filtrar$/i }).click();
    await expect(
      page.getByText(/Ningún consultante coincide con el filtro actual/i)
    ).toBeVisible();
  });

  test("valida que el nombre de la ficha sea obligatorio", async ({
    page,
    account,
  }) => {
    void account;

    await page.goto("/consultantes?nuevo=1");
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /Crear ficha/i }).click();

    await expect(dialog.getByRole("alert").first()).toBeVisible();
    await expect(dialog).toBeVisible();
  });
});
