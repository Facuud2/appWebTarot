import { test, expect } from "../fixtures/test";
import { createConsultant } from "../helpers/rpc";

test.describe("Agenda", () => {
  test("agenda una sesión para un consultante y la conserva", async ({
    page,
    account,
    request,
  }) => {
    void account;
    const consultant = await createConsultant(request, {
      fullName: "Sofía Agenda",
      alias: "Sofía",
    });

    await page.goto(`/agenda?nueva=1&consultantId=${consultant.id}`);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog
      .getByLabel(/Motivo o título de la sesión/i)
      .fill("Sesión E2E de seguimiento");
    await dialog.getByRole("button", { name: /Agendar sesión/i }).click();

    await expect(dialog).toBeHidden();
    await expect(
      page.getByText("Sesión E2E de seguimiento").first()
    ).toBeVisible();

    await page.reload();
    await expect(
      page.getByText("Sesión E2E de seguimiento").first()
    ).toBeVisible();
  });

  test("muestra la agenda vacía con accesos para agendar", async ({
    page,
    account,
  }) => {
    void account;

    await page.goto("/agenda");
    await expect(
      page.getByRole("heading", { name: /Agenda de sesiones/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Agendar sesión/i }).first()
    ).toBeVisible();
  });
});
