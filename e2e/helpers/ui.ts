import type { Locator, Page } from "@playwright/test";

/**
 * Pulsa una acción del pie de un formulario largo.
 *
 * En viewports por debajo de `md` la app fija la barra de navegación inferior
 * (`nav.app-bottom-nav`), que se superpone a los últimos píxeles del viewport.
 * `scrollIntoViewIfNeeded` deja el botón justo en el borde inferior, detrás de
 * la barra, y el clic queda interceptado. Desplazar hasta el final del
 * documento aprovecha el padding inferior de `main` y deja el botón libre.
 */
export async function clickFooterAction(page: Page, locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight)
  );
  // La app usa scroll suave en algunos cambios de paso: espera a que pare.
  await page.waitForTimeout(250);
  await locator.click({ timeout: 8_000 });
}
