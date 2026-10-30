import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures/test";
import {
  expectNoHorizontalOverflow,
  isMobileProject,
} from "./fixtures/device";
import { clickFooterAction } from "./helpers/ui";

interface TinyField {
  tag: string;
  identifier: string;
  fontSize: number;
}

/**
 * Campos visibles cuyo `font-size` computado queda por debajo de 16px.
 * iOS/iPadOS WebKit amplía la pantalla al enfocarlos y, como el pinch está
 * desactivado, la vista queda atrapada con zoom.
 */
async function collectFieldsBelowSixteen(page: Page): Promise<TinyField[]> {
  return page.evaluate(() => {
    const isVisible = (el: HTMLElement) => {
      const style = getComputedStyle(el);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.opacity === "0"
      ) {
        return false;
      }
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    return Array.from(
      document.querySelectorAll<HTMLElement>("input, select, textarea")
    )
      .filter(isVisible)
      .map((el) => ({
        el,
        size: Number.parseFloat(getComputedStyle(el).fontSize),
      }))
      .filter(({ size }) => Number.isFinite(size) && size < 16)
      .map(({ el, size }) => ({
        tag: el.tagName.toLowerCase(),
        identifier:
          el.id ||
          el.getAttribute("aria-label") ||
          el.getAttribute("name") ||
          el.getAttribute("placeholder") ||
          "(sin identificar)",
        fontSize: size,
      }));
  });
}

async function expectNoAutoZoom(page: Page, context: string) {
  await expect
    .poll(() => collectFieldsBelowSixteen(page), {
      message: `${context}: todo campo visible debe medir al menos 16px para que iOS no aplique auto-zoom`,
      timeout: 8_000,
    })
    .toEqual([]);
}

async function goToStepThree(page: Page) {
  await page.goto("/lecturas/nueva");
  await expect(
    page.getByRole("heading", { name: /Paso 1: Configuración y Estructura/i })
  ).toBeVisible();
  await page.waitForTimeout(400);

  await clickFooterAction(
    page,
    page.getByRole("button", { name: /Siguiente: (Indicar cartas|Cartas)/i })
  );
  await expect(
    page.getByRole("heading", { name: /Paso 2: Selección de Cartas/i })
  ).toBeVisible();

  await clickFooterAction(
    page,
    page.getByRole("button", {
      name: /Siguiente: (Acomodar cartas|Tapete)/i,
    })
  );
  await expect(
    page.getByRole("heading", { name: /Paso 3: Acomodar Mesa/i })
  ).toBeVisible();
}

async function readBottomNav(page: Page) {
  return page.evaluate(() => {
    const nav = document.querySelector<HTMLElement>(".app-bottom-nav");
    if (!nav) return null;
    const style = getComputedStyle(nav);
    return {
      opacity: style.opacity,
      transform: style.transform,
      paddingBottom: Number.parseFloat(style.paddingBottom),
    };
  });
}

test.describe("Auditoría de reglas del sistema operativo @device", () => {
  test("Test 1 — ningún campo visible dispara el auto-zoom de iOS", async ({
    page,
    account,
  }, testInfo) => {
    test.skip(
      !isMobileProject(testInfo.project.name),
      "El auto-zoom de campos es exclusivo de iOS/iPadOS/Android táctil"
    );
    void account;

    // 1. Acceso sin sesión (la cookie redirige a `/`).
    const cookies = await page.context().cookies();
    await page.context().clearCookies();
    await page.goto("/acceso");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoAutoZoom(page, "/acceso");
    await page.context().addCookies(cookies);

    // 2. Onboarding en modo repaso (evita la redirección de completado).
    await page.goto("/onboarding?repaso=1");
    const stepHeading = (name: RegExp) =>
      page.getByRole("heading", { name });
    await expect(
      stepHeading(/¿Qué tan familiarizado estás con el tarot\?/i)
    ).toBeVisible();
    await expectNoAutoZoom(page, "onboarding · paso 1");

    await page.getByRole("radio", { name: /Novato/ }).click();
    await expect(
      stepHeading(/¿Qué te gustaría hacer con la aplicación\?/i)
    ).toBeVisible();
    const next = page.getByRole("button", { name: /^Siguiente$/ });
    if (await next.isDisabled()) {
      await page
        .getByRole("checkbox", { name: /Llevar un registro organizado/i })
        .click();
    }
    await next.click();
    await expect(
      stepHeading(/¿Qué mazo utilizas con mayor frecuencia\?/i)
    ).toBeVisible();
    await page.getByRole("button", { name: /Sumar mi propio mazo/i }).click();
    const deckDialog = page.getByRole("dialog");
    await expect(deckDialog).toBeVisible();
    await expectNoAutoZoom(page, "onboarding · alta de mazo");
    await page
      .getByRole("button", { name: /Cerrar ventana|Cancelar/i })
      .first()
      .click();
    await expect(deckDialog).toBeHidden();

    // 3. Nueva lectura: los tres pasos del formulario.
    await page.goto("/lecturas/nueva");
    await expect(
      page.getByRole("heading", {
        name: /Paso 1: Configuración y Estructura/i,
      })
    ).toBeVisible();
    await expectNoAutoZoom(page, "lectura · paso 1");

    await clickFooterAction(
      page,
      page.getByRole("button", { name: /Siguiente: (Indicar cartas|Cartas)/i })
    );
    await expect(
      page.getByRole("heading", { name: /Paso 2: Selección de Cartas/i })
    ).toBeVisible();
    await expectNoAutoZoom(page, "lectura · paso 2");

    await clickFooterAction(
      page,
      page.getByRole("button", {
        name: /Siguiente: (Acomodar cartas|Tapete)/i,
      })
    );
    await expect(
      page.getByRole("heading", { name: /Paso 3: Acomodar Mesa/i })
    ).toBeVisible();
    await expectNoAutoZoom(page, "lectura · paso 3");

    // 4. Agenda: modal de nueva sesión.
    await page.goto("/agenda");
    await page
      .getByRole("button", { name: /Agendar sesión|Agendar en este día/i })
      .first()
      .click();
    const agendaDialog = page.getByRole("dialog");
    await expect(agendaDialog).toBeVisible();
    await expectNoAutoZoom(page, "agenda · nueva sesión");
    await page.keyboard.press("Escape");
    await expect(agendaDialog).toBeHidden();

    // 5. Cartas y mazos: modal de mazo personalizado.
    await page.goto("/grimorio?tab=mazos");
    await page
      .getByRole("button", { name: /Registrar mazo/i })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoAutoZoom(page, "grimorio · mazo personalizado");
  });

  test("Test 2 — cero desbordamiento horizontal en todos los anchos", async ({
    page,
    account,
  }) => {
    void account;

    for (const route of [
      "/",
      "/lecturas/nueva",
      "/agenda",
      "/grimorio",
      "/consultantes",
      "/ajustes",
    ]) {
      await page.goto(route);
      await expect(page.locator("html")).toHaveAttribute("data-os", /.+/);
      await expectNoHorizontalOverflow(page);
    }

    await goToStepThree(page);
    await expectNoHorizontalOverflow(page);

    const cookies = await page.context().cookies();
    await page.context().clearCookies();
    await page.goto("/acceso");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.context().addCookies(cookies);
  });

  test("Test 3 — el tapete blinda selección, gestos y bordes del sistema", async ({
    page,
    account,
  }) => {
    void account;
    await goToStepThree(page);

    const cards = page.locator("[data-spread-card]");
    await expect(cards.first()).toBeVisible();

    // Sin selección nativa ni lupa/menú contextual al mantener pulsada la carta.
    const shield = await cards.first().evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        userSelect: style.userSelect,
        webkitUserSelect: style.getPropertyValue("-webkit-user-select").trim(),
        touchCallout: style.getPropertyValue("-webkit-touch-callout").trim(),
      };
    });
    expect(shield.userSelect).toBe("none");
    expect(["none", ""]).toContain(shield.webkitUserSelect);
    expect(["none", ""]).toContain(shield.touchCallout);

    // Ninguna carta vive en la franja de 20px reservada al edge-swipe.
    const measureGaps = () =>
      page.evaluate(() =>
        Array.from(
          document.querySelectorAll<HTMLElement>("[data-spread-card]")
        ).map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            left: rect.left,
            right: window.innerWidth - rect.right,
          };
        })
      );

    await expect
      .poll(async () => {
        const gaps = await measureGaps();
        return gaps.length > 0
          ? Math.min(...gaps.map((gap) => Math.min(gap.left, gap.right)))
          : -1;
      }, {
        message:
          "Cada carta debe quedar a >= 20px del borde lateral del viewport",
      })
      .toBeGreaterThanOrEqual(20);

    const canvas = page.locator("[data-spread-canvas]");
    const moveToggle = page.getByRole("button", {
      name: /Mover cartas|Terminar de mover/i,
    });

    if (await moveToggle.isVisible()) {
      await expect
        .poll(() => canvas.evaluate((el) => getComputedStyle(el).touchAction))
        .toBe("pan-y");
      await moveToggle.click();
      await expect
        .poll(() => canvas.evaluate((el) => getComputedStyle(el).touchAction))
        .toBe("none");

      // Arrastre real hasta ambos extremos: el clamp del perímetro seguro
      // impide que la carta entre en la zona de gestos del sistema.
      const viewport = page.viewportSize();
      for (const targetX of [1, (viewport?.width ?? 360) - 2]) {
        const box = await cards.first().boundingBox();
        expect(box).not.toBeNull();
        if (!box) continue;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(targetX, box.y + box.height / 2, { steps: 12 });
        await page.mouse.up();
      }

      await expect
        .poll(async () => {
          const gaps = await measureGaps();
          return gaps.length > 0
            ? Math.min(...gaps.map((gap) => Math.min(gap.left, gap.right)))
            : -1;
        })
        .toBeGreaterThanOrEqual(20);

      await moveToggle.click();
      await expect
        .poll(() => canvas.evaluate((el) => getComputedStyle(el).touchAction))
        .toBe("pan-y");
    }

    // Los controles fuera del lienzo conservan `touch-action: manipulation`.
    const manipulation = await page
      .getByRole("button", { name: /Achicar panel de cartas/i })
      .evaluate((el) => getComputedStyle(el).touchAction);
    expect(manipulation).toBe("manipulation");
  });

  test("Test 4 — safe areas y barra inferior al enfocar un textarea", async ({
    page,
    account,
  }, testInfo) => {
    test.skip(
      !isMobileProject(testInfo.project.name),
      "La barra inferior solo existe en móvil/tablet"
    );
    test.skip(
      (page.viewportSize()?.width ?? 0) >= 768,
      "Por encima de md la navegación inferior no se renderiza"
    );
    void account;

    await goToStepThree(page);

    const textarea = page.getByLabel(/Síntesis o conclusión/i);
    await textarea.scrollIntoViewIfNeeded();
    await textarea.focus();

    await expect(page.locator("html")).toHaveAttribute(
      "data-keyboard",
      "open"
    );
    await expect.poll(async () => (await readBottomNav(page))?.opacity).toBe("0");

    await page.locator("h1").click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-keyboard",
      "closed"
    );

    await expect.poll(async () => (await readBottomNav(page))?.opacity).toBe("1");
    const nav = await readBottomNav(page);
    expect(nav).not.toBeNull();
    // 0.6rem base + env(safe-area-inset-bottom, 0px).
    expect(nav?.paddingBottom ?? 0).toBeGreaterThanOrEqual(9);
  });
});
