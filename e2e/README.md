# Pruebas E2E (Playwright)

Suite de integración real en navegador para Grimorio. Cada spec es agnóstico
del dispositivo: el sistema operativo, el navegador y el viewport vienen del
proyecto de Playwright, no de scripts de User-Agent ad-hoc.

## Requisitos

```bash
npm install
npx playwright install chromium webkit   # una sola vez
npm run build                            # el webServer usa `next start`
```

En **Arch Linux** el WebKit de Playwright no arranca porque está compilado
contra ICU 74 / libxml2 2.9 de Ubuntu. Sin `sudo`:

```bash
bash scripts/setup-webkit-arch.sh
```

El script descarga los `.deb` de Ubuntu, extrae las bibliotecas en
`~/.cache/playwright-webkit-libs` y las enlaza al bundle. `playwright.config.ts`
detecta ese directorio y saltea la validación de dependencias. En Ubuntu/Debian
alcanza con `npx playwright install --with-deps chromium webkit`.

## Ejecución

```bash
npm run test:e2e          # Tier 1 (7 proyectos): el chequeo de cada PR
npm run test:e2e:smoke    # humo rápido: 3 proyectos
npm run test:e2e:android  # Pixel 7, Galaxy S24, A55 y Tab S9
npm run test:e2e:ios      # iPhone SE/15, iPad Pro 11 y iPadOS UA real
npm run test:e2e:device   # solo specs @device en todos los proyectos
npm run test:e2e:full     # matriz completa (13 proyectos, nightly)
```

Alternativas puntuales:

```bash
npx playwright test e2e/specs/04-mobile-back.spec.ts --project=iphone-15
npx playwright test --ui
PLAYWRIGHT_WORKERS=4 npm run test:e2e
```

El webServer arranca en `http://127.0.0.1:3100` con una base SQLite efímera
(`data/e2e-run.db`) y una demo aislada (`data/e2e-demo.db`). Se borra al inicio
de cada corrida, así que no hace falta limpiar nada a mano. No reutiliza un
servidor existente para evitar datos y builds viejos.

## Matriz de dispositivos

| Proyecto          | Motor   | SO esperado (`data-os`) | Navegador (`data-browser`) |
| ----------------- | ------- | ----------------------- | -------------------------- |
| `desktop-chrome`  | Chromium| `desktop`               | `other`                    |
| `desktop-safari`  | WebKit  | `desktop`               | `other`                    |
| `pixel-7`         | Chromium| `android`               | `chrome-android`           |
| `galaxy-s24`      | Chromium| `android`               | `chrome-android`           |
| `galaxy-a55`      | Chromium| `android`               | `chrome-android`           |
| `galaxy-tab-s9`   | Chromium| `android`               | `chrome-android`           |
| `iphone-se`       | WebKit  | `ios`                   | `safari`                   |
| `iphone-15`       | WebKit  | `ios`                   | `safari`                   |
| `iphone-16-pro-max` | WebKit| `ios`                   | `safari`                   |
| `iphone-chrome`   | WebKit  | `ios`                   | `chrome-ios`               |
| `ipad-pro-11`     | WebKit  | `ipados`                | `safari`                   |
| `ipad-mini`       | WebKit  | `ipados`                | `safari`                   |
| `ipados-real-ua`  | WebKit  | `ipados`                | `safari`                   |

`ipados-real-ua` usa un UA de Macintosh y fuerza `maxTouchPoints = 5` con un
`addInitScript` (fixture `page`), replicando el caso que Safari envía en un iPad
físico. Es la rama que no se puede cubrir con el descriptor `iPad *` de
Playwright, cuyo UA contiene `iPad`.

Tier 1 (cada PR): `desktop-chrome`, `pixel-7`, `galaxy-s24`, `iphone-se`,
`iphone-15`, `ipad-pro-11`, `ipados-real-ua`.

## Estructura

```
e2e/
  fixtures/
    test.ts        # test base + fixture `account` + override de `page`
    device.ts      # helpers de dispositivo, teclado, PWA y SpeechRecognition
  helpers/
    rpc.ts         # siembra de usuarios/mazos/citas vía /api/rpc
    ui.ts          # acciones del pie de formulario por encima de la barra fija
  specs/
    01-auth.spec.ts
    02-onboarding.spec.ts
    03-device-contract.spec.ts
    04-mobile-back.spec.ts
    05-card-combobox.spec.ts
    06-voice-dictation.spec.ts
    07-pwa-install.spec.ts
    08-readings.spec.ts
    09-grimorio.spec.ts
    10-agenda.spec.ts
    11-consultants.spec.ts
```

| Spec | Qué cubre |
| ---- | --------- |
| `01-auth` | registro, login, credenciales inválidas y demo sin credenciales |
| `02-onboarding` | las 7 etapas (incluida la de instalación) hasta la mesa |
| `03-device-contract` | `data-os`/`data-browser`, safe areas y ausencia de scroll horizontal |
| `04-mobile-back` | `popstate` en el selector de cartas y guardia de lectura sin guardar |
| `05-card-combobox` | búsqueda, filtro por palo, estado vacío y alto máximo en móvil |
| `06-voice-dictation` | micrófono, modo continuo por plataforma, transcripción y errores |
| `07-pwa-install` | instrucciones iOS/iPad/Android, prompt nativo y onboarding |
| `08-readings` | lectura completa, borrador y demo con agenda |
| `09-grimorio` | búsqueda de cartas, filtro por arcanos y mazos del espacio |
| `10-agenda` | alta de cita y agenda vacía |
| `11-consultants` | alta y validación de fichas |

## Datos de prueba

Cada test que pide la fixture `account` crea un usuario único:

1. `auth.register` + `onboarding.complete` por `/api/rpc`.
2. `grimorio.createDeck` (RWS, 78 cartas) porque las cuentas nuevas no heredan
   los mazos integrados que se siembran al iniciar el servidor.
3. La cookie de sesión se inyecta en el contexto del navegador.

Las pruebas nunca mutan el usuario demo compartido. `openDemoWorkspace()` solo
se usa en tests de lectura que no escriben datos.

## Qué se simula (y qué no)

Playwright no puede reproducir todo el hardware real:

- **Teclado virtual**: en Chromium/WebKit headless no hay teclado. La fixture
  `mockKeyboard` reemplaza `visualViewport` por un objeto controlable y
  `setKeyboardOpen()` reduce su altura. Se valida `data-keyboard`, `--vvh` y la
  ocultación de la barra inferior. La detección por foco (`INPUT`/`TEXTAREA`)
  sí se prueba de verdad.
- **Safe areas**: `env(safe-area-inset-*)` vale `0` en emulación. Se comprueban
  los mínimos (`padding-top >= 12px`, `padding-bottom >= 9.6px`) y que no haya
  scroll horizontal; los valores reales de notch/Home Indicator no son
  automatizables.
- **PWA standalone**: `display-mode: standalone` se fuerza con `matchMedia` y
  `navigator.standalone`. El diálogo nativo de instalación no es automatizable;
  se mockea `beforeinstallprompt` para verificar que se llama a `prompt()`.
- **SpeechRecognition**: no existe en WebKit headless ni en Chromium de test.
  `mockSpeechRecognition()` instala un `SpeechRecognition` falso que registra
  las opciones (`lang`, `continuous`, `interimResults`) y expone helpers para
  emitir resultados finales/provisionales y errores (`not-allowed`). Con eso se
  valida el hook real, no el mock: Android reinicia en cada frase
  (`continuous: false`), iOS y escritorio usan sesión continua, y el idioma es
  `es-AR`.
- **Instalación PWA**: además del diálogo por plataforma, se prueba el prompt
  nativo de Chrome Android (incluido el flujo que completa el onboarding sin
  volver a pedir el tutorial).

## Convenciones

- Un spec por capacidad; nunca un spec por modelo de teléfono.
- Los selectores usan rol/label accesible, no clases de Tailwind.
- `@smoke` para el camino crítico; `@device` para el contrato multiplataforma.
- Los tests se ejecutan en paralelo con 2 workers por defecto (SQLite en WAL);
  `PLAYWRIGHT_WORKERS` lo sobreescribe.
- Las acciones del pie de formulario usan `clickFooterAction()`: en viewports
  por debajo de `md` la barra inferior fija puede tapar el botón si el
  documento ya está al final del scroll.

## Tiempos de referencia

| Corrida | Proyectos | Tests | Tiempo |
| ------- | --------- | ----- | ------ |
| Tier 1 (`npm run test:e2e`) | 7 | ~235 | ~5 min |
| Matriz completa (`npm run test:e2e:full`) | 13 | ~481 | ~10–13 min |

Los tiempos son con 2 workers en una máquina de desarrollo; el primer arranque
incluye `next start` sobre un build ya hecho.
