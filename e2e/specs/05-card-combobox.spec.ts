import { test, expect } from "../fixtures/test";
import { isMobileProject, mockKeyboard, setKeyboardOpen } from "../fixtures/device";

async function openCardPicker(page: import("@playwright/test").Page) {
  await page.goto("/lecturas/nueva");
  await expect(
    page.getByRole("heading", { name: /Paso 1: Configuración y Estructura/i })
  ).toBeVisible();
  await page.waitForTimeout(500);
  await page
    .getByRole("button", { name: /Siguiente: (Indicar cartas|Cartas)/i })
    .click();
  await expect(
    page.getByRole("heading", { name: /Paso 2: Selección de Cartas/i })
  ).toBeVisible();
  await page.getByRole("combobox").first().click();
  const search = page.getByRole("searchbox", {
    name: /Buscar carta por nombre, símbolo o palabra clave/i,
  });
  await expect(search).toBeVisible();
  return search;
}

test.describe("Selector de cartas", () => {
  test("busca, filtra y selecciona una carta", async ({ page, account }) => {
    void account;
    const search = await openCardPicker(page);

    await search.fill("loco");
    await expect(
      page.getByRole("option", { name: /El Loco/i })
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: /La Emperatriz/i })
    ).toHaveCount(0);

    await page.getByRole("option", { name: /El Loco/i }).click();

    await expect(page.getByRole("combobox").first()).toContainText("El Loco");
    await expect(search).toBeHidden();
  });

  test("filtra por palo y muestra el estado vacío", async ({
    page,
    account,
  }) => {
    void account;
    const search = await openCardPicker(page);

    await page.getByRole("button", { name: /^Copas$/i }).click();
    await search.fill("espada");
    await expect(
      page.getByText(/Ninguna carta coincide con la búsqueda/i)
    ).toBeVisible();

    await page.getByRole("button", { name: /^Todos$/i }).click();
    await expect(
      page.getByRole("option", { name: /As de Espadas|Espadas/i }).first()
    ).toBeVisible();
  });

  test("en móvil limita la altura de la lista al viewport visible", async ({
    page,
    account,
  }, testInfo) => {
    test.skip(
      !isMobileProject(testInfo.project.name),
      "El ajuste por teclado aplica a móvil y tablet"
    );
    void account;
    await mockKeyboard(page);
    const search = await openCardPicker(page);

    const measure = () =>
      page.evaluate(() => {
        const list = document.querySelector(
          "[cmdk-list]"
        ) as HTMLElement | null;
        const content = document.querySelector(
          ".card-picker-mobile-content"
        ) as HTMLElement | null;
        const vvh = parseFloat(
          document.documentElement.style.getPropertyValue("--vvh")
        );
        const wrapper = document.querySelector(
          "[data-radix-popper-content-wrapper]"
        ) as HTMLElement | null;
        const rect = wrapper?.getBoundingClientRect();
        const vv = window.visualViewport;
        return {
          listMaxHeight: list ? parseFloat(getComputedStyle(list).maxHeight) : 0,
          popoverMaxHeight: content
            ? parseFloat(getComputedStyle(content).maxHeight)
            : 0,
          vvh,
          top: rect?.top ?? -1,
          bottom: rect?.bottom ?? -1,
          left: rect?.left ?? -1,
          right: rect?.right ?? -1,
          vvTop: vv?.offsetTop ?? 0,
          vvLeft: vv?.offsetLeft ?? 0,
          vvWidth: vv?.width ?? window.innerWidth,
        };
      });

    const expectInsideViewport = (box: Awaited<ReturnType<typeof measure>>) => {
      expect(box.top).toBeGreaterThanOrEqual(box.vvTop - 1);
      expect(box.bottom).toBeLessThanOrEqual(box.vvTop + box.vvh + 1);
      expect(box.left).toBeGreaterThanOrEqual(box.vvLeft - 1);
      expect(box.right).toBeLessThanOrEqual(box.vvLeft + box.vvWidth + 1);
    };

    const before = await measure();
    expect(before.vvh).toBeGreaterThan(0);
    expect(before.listMaxHeight).toBeGreaterThan(0);
    expect(before.listMaxHeight).toBeLessThanOrEqual(before.vvh);
    expect(before.popoverMaxHeight).toBeLessThanOrEqual(before.vvh);
    expectInsideViewport(before);

    await setKeyboardOpen(page, true);
    await expect
      .poll(async () => (await measure()).vvh)
      .toBeLessThan(before.vvh - 50);

    const after = await measure();
    expect(after.listMaxHeight).toBeLessThanOrEqual(after.vvh);
    expect(after.popoverMaxHeight).toBeLessThanOrEqual(after.vvh);
    // El popover debe reacomodarse dentro del viewport visual, no quedar
    // empujado fuera por el teclado.
    expectInsideViewport(after);
    expect(search).toBeVisible();
  });
});
