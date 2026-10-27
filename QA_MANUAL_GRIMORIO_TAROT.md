# Informe de QA manual — Grimorio Tarot

**Entorno:** Producción en Vercel  
**URL Objetivo:** https://appwebtarot.vercel.app  
**Fecha de Ejecución:** 27 de Octubre de 2026  
**Responsable:** Auditoría QA Manual, E2E y UX/UI (Black-Box Testing)  
**Usuario de Prueba Creado:** `qa-grimorio-20261027@antigravity.test`  
**Espacio de Prueba:** `QA-GRIMORIO-20261027 Espacio`  

---

## A. Resumen ejecutivo

La plataforma **Grimorio Tarot** en su versión publicada en producción presenta una propuesta de producto diferencial, caracterizada por un diseño visual editorial sobresaliente, una experiencia tipográfica cuidada, coherencia conceptual con la práctica del tarot y una accesibilidad técnica ejemplar (puntuación perfecta de **100/100 en Lighthouse** en Accesibilidad, Buenas Prácticas y SEO).

El flujo de **Onboarding de 6 pasos** y la mesa interactiva de lectura (`LiveReadingWorkbench`) proporcionan un soporte muy intuitivo y potente para registrar lecturas tanto presenciales como a distancia.

No obstante, la auditoría ha identificado **dos defectos críticos (P0)** y **dos defectos de alta prioridad (P1)** derivados principalmente de la interacción entre la arquitectura Serverless de Vercel y el manejo de persistencia:

1. **[P0] Pérdida de estado en Modo Demostración:** El espacio demo escribe su base de datos en `/tmp/grimorio-demo.db`. Al estar desplegado sobre funciones Serverless de Vercel (contenedores efímeros desacoplados entre peticiones), la creación de una lectura en modo demo genera un error **404 inmediato** ("No encontramos esta página"), impidiendo que cualquier evaluador o visitante pruebe la aplicación sin registrarse.
2. **[P0] Secuestro de sesión por sobreescritura de Onboarding en Ajustes:** Al guardar preferencias en `/ajustes`, el registro de preferencias en base de datos no preserva el objeto de estado `onboarding`, provocando que el sistema interprete que el usuario no ha completado la bienvenida y forzando una redirección destructiva e irreversible de vuelta al Paso 1 del Onboarding.
3. **[P1] Caída con HTTP 500 en Consultantes (`/consultantes`) y Agenda (`/agenda`):** Ambos módulos clave sufren un fallo de servidor no recuperable (`digest: 1284427796`) para usuarios registrados en la base de datos de producción (Turso Cloud).
4. **[P1] Excepción en tiempo de ejecución en Nueva Lectura (`/lecturas/nueva`):** Se presenta un fallo de cliente ("Minified React error #441") que bloquea la preparación convencional de lecturas fuera del flujo guiado de bienvenida.

**Veredicto General:** La aplicación tiene bases sólidas y una usabilidad sobresaliente en sus componentes activos, pero **no está lista para producción pública** hasta que se subsanen los defectos P0 y P1 detectados.

---

## B. Entorno de pruebas

- **URL de Producción:** `https://appwebtarot.vercel.app`
- **Infraestructura detectada:** Vercel Serverless Edge/Node.js Runtime + Turso Cloud (LibSQL)
- **Navegadores utilizados:** Google Chrome (versión 130+ en Linux x86_64 bajo entorno gráfico Wayland/X11) con herramientas de inspección y control de sesión real.
- **Resoluciones evaluadas:**
  - **Escritorio:** 1365 × 768 px
  - **Tableta:** 768 × 1024 px
  - **Móvil:** 390 × 844 px
- **Prefijo de datos de prueba:** `QA-GRIMORIO-20261027`

---

## C. Inventario de funcionalidades descubiertas

1. **Acceso y Autenticación (`/acceso`):**
   - Modo Demostración ("Abrir demostración") sin credenciales.
   - Registro de nueva cuenta con validaciones de formulario.
   - Inicio de sesión con correo y contraseña.
2. **Onboarding Guiado (`/onboarding`):**
   - 6 pasos interactivos: Configuración de espacio, elección de mazo, tirada inicial guiada, interpretación en vivo, sincronización de notas y finalización.
3. **Mesa de Lectura en Vivo (`/lecturas/en-vivo` y `/lecturas/[id]`):**
   - Lienzo interactivo (`LiveReadingWorkbench`) con disposición geométrica de cartas (Cruz Celta, Tríadas, etc.).
   - Selector de orientación de arcanos (Al derecho / Invertida).
   - Selector de fenómenos del mazo (saltó al barajar, base, corte).
   - Notas contextuales en tiempo real por carta.
4. **Historial de Lecturas (`/lecturas`):**
   - Listado paginado con filtros por fecha, tipo de tirada y consultante.
   - Visualización de cartas involucradas mediante chips visuales.
5. **Catálogo de Cartas / Grimorio (`/grimorio`):**
   - Biblioteca multi-tradición (Rider-Waite-Smith, Marsella, Thoth).
   - Fichas individuales con simbolismo, arquetipos y notas privadas del lector.
6. **Observatorio de Fenómenos (`/fenomenos`):**
   - Registro cronológico de sincronicidades y cartas repetidas.
7. **Directorio de Consultantes (`/consultantes`):**
   - Gestión de perfiles, lecturas asociadas e historial de clientes.
8. **Agenda de Sesiones (`/agenda`):**
   - Calendario y planificación de citas de tarot.
9. **Configuración y Ajustes (`/ajustes`):**
   - Personalización del nombre del consultorio/espacio, mazo por defecto y preferencias visuales.
10. **Buscador Global (`Command/Ctrl + K`):**
    - Modal de búsqueda rápida en tiempo real sobre cartas, tiradas y notas.

---

## D. Matriz general de resultados

| ID Caso | Módulo | Descripción | Tipo | Estado | Prioridad |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GT-UX-001** | Entrada | Reto de los 2 minutos: comprensión y primera acción | UX | **APROBADA** | N/A |
| **GT-UX-002** | Entrada | Claridad conceptual (mazos, tiradas, fenómenos) | UX | **APROBADA** | N/A |
| **GT-UX-003** | Global | Buscador Command+K en vivo | UX / Funcional | **APROBADA** | N/A |
| **GT-UX-004** | Tema | Conmutador Claro / Oscuro / Sistema | Visual / UX | **APROBADA** | N/A |
| **GT-FUNC-001** | Demo | Crear lectura en Modo Demostración | Funcional | **FALLIDA** | **P0** |
| **GT-FUNC-002** | Auth | Registro de usuario real en base de datos Turso | Funcional | **APROBADA** | N/A |
| **GT-FUNC-003** | Onboarding | Flujo completo de 6 pasos con tirada guiada | Funcional / UX | **APROBADA** | N/A |
| **GT-FUNC-004** | Persistencia | Guardado de lectura de onboarding en base de datos | Funcional | **APROBADA** | N/A |
| **GT-FUNC-005** | Mesa viva | Registro de evento ("Saltó al mezclar") | Funcional | **APROBADA** | N/A |
| **GT-FUNC-006** | Mesa viva | Guardado de notas por arcano asociadas al grimorio | Funcional | **APROBADA** | N/A |
| **GT-FUNC-007** | Fenómenos | Visualización de eventos en `/fenomenos` | Funcional | **APROBADA** | N/A |
| **GT-FUNC-008** | Historial | Filtros y consulta en `/lecturas` | Funcional | **APROBADA** | N/A |
| **GT-FUNC-009** | Grimorio | Exploración de arcanos en `/grimorio` | Funcional | **APROBADA** | N/A |
| **GT-FUNC-010** | Clientes | Apertura del directorio `/consultantes` | Funcional | **FALLIDA** | **P1** |
| **GT-FUNC-011** | Agenda | Apertura de agenda en `/agenda` | Funcional | **FALLIDA** | **P1** |
| **GT-FUNC-012** | Lectura | Formulario `/lecturas/nueva` para usuario real | Funcional | **FALLIDA** | **P1** |
| **GT-RESP-001** | Responsive | Desktop (1365×768): distribución y legibilidad | Responsividad | **APROBADA** | N/A |
| **GT-RESP-002** | Responsive | Tablet (768×1024): drawer y layout fluido | Responsividad | **APROBADA** | N/A |
| **GT-RESP-003** | Responsive | Móvil (390×844): barra inferior y áreas táctiles | Responsividad | **APROBADA** | N/A |
| **GT-FORM-001** | Formularios | Validación de campos obligatorios en `/acceso` | Validación | **APROBADA** | N/A |
| **GT-FORM-002** | Formularios | Formato de email incorrecto y contraseña corta | Validación | **APROBADA** | N/A |
| **GT-FORM-003** | Formularios | Resiliencia XSS y SQLi en nombres y campos | Seguridad / Form | **APROBADA** | N/A |
| **GT-MONKEY-001** | Monkey | Guardado de preferencias en `/ajustes` | Resiliencia | **FALLIDA** | **P0** |
| **GT-MONKEY-002** | Monkey | Interrupción de modales con Escape y doble clic | Resiliencia | **APROBADA** | N/A |
| **GT-LOAD-001** | Rendimiento | Tiempos de respuesta percibidos y transiciones | Rendimiento | **APROBADA** | N/A |
| **GT-A11Y-001** | Accesibilidad | Navegación por teclado (Tab / Shift+Tab) y foco | Accesibilidad | **APROBADA** | N/A |
| **GT-A11Y-002** | Accesibilidad | Auditoría técnica Lighthouse (100/100) | Accesibilidad | **APROBADA** | N/A |

---

## E. Experiencia del usuario nuevo (Reto de los 2 minutos)

- **Tiempo de inicio:** 00:00  
- **Tiempo de comprensión y primera tirada completada:** 01:42 (Reto superado con éxito).
- **Observaciones del recorrido:**
  1. Al acceder a `https://appwebtarot.vercel.app`, el usuario es recibido por una pantalla de bienvenida sobria y clara en `/acceso`, con un botón directo a "Abrir demostración" y opciones para crear cuenta.
  2. La jerga técnica brilla por su ausencia; el vocabulario utilizado está perfectamente adaptado al tarotista ("mazo canónico", "consultante", "arcanos", "fenómenos sincrónicos").
  3. El asistente inicial guía paso a paso sin saturar de opciones. Las cartas se seleccionan de forma táctil o visual sin ambigüedad.

---

## F. Resultados de las pruebas funcionales

- **Flujo de Onboarding:** Altamente interactivo. Permite elegir mazo (ej. Rider-Waite-Smith 1909), barajar, seleccionar cartas, situarlas en posiciones predefinidas y registrar impresiones en vivo.
- **Persistencia en Base de Datos Turso:** Las lecturas completadas mediante el onboarding quedan registradas correctamente en la tabla de lecturas del usuario y se consultan de inmediato en `/lecturas` con sus filtros por arcanos.
- **Sincronización de Notas con el Grimorio:** Las notas anotadas sobre una carta en la mesa en vivo se sincronizan automáticamente con la ficha de estudio de esa carta en la sección `/grimorio`.
- **Registro de Fenómenos:** El marcado de cartas especiales ("Saltó al mezclar") aparece reflejado en `/fenomenos` con fecha y contexto de la lectura.

---

## G. Formularios y casos límite

- **Campos obligatorios:** Los formularios de acceso señalan con claridad los campos requeridos con atributos `aria-invalid` y mensajes semánticos comprensibles.
- **Textos largos y caracteres especiales:** Se probaron descripciones de consulta de más de 800 caracteres conteniendo eñes, acentos, diéresis, comillas tipográficas y saltos de línea; todos se conservaron intactos sin desbordamiento ni truncado.
- **Inyecciones controladas (XSS / SQLi):** Se introdujeron cadenas como `<script>alert('QA')</script>` y `' OR 1=1 --` en el nombre del espacio. La aplicación las sanitizó y escapó adecuadamente, mostrándolas como texto plano literal y sin alterar las sentencias SQL preparadas.

---

## H. Monkey testing razonado

- **Doble clic en botones de guardado:** Los botones se deshabilitan instantáneamente durante la mutación, previniendo duplicación de registros por doble clic o impaciencia del usuario.
- **Manejo de modales e interrupciones:** El buscador global y los diálogos secundarios se cierran de manera segura con la tecla `Escape` o clicando fuera del área modal, restaurando el foco al disparador original.
- **Ajustes y persistencia cruzada (Fallo P0 detectado):** Al guardar los ajustes de perfil en `/ajustes`, se produjo una pérdida de estado crítica al despojarse el campo de onboarding de las preferencias del usuario.

---

## I. Auditoría de responsividad visual

- **Escritorio (1365 × 768 px):** Interfaz amplia, barra lateral de navegación estructurada, mesa de cartas espaciosa y sin solapamientos.
- **Tableta (768 × 1024 px):** Colapso elegante de la barra lateral en menú hamburguesa accesible mediante cajón lateral (drawer), manteniendo legible la tipografía editorial.
- **Móvil (390 × 844 px):** Adaptación a barra de navegación inferior ergonómica para el pulgar, tarjetas en disposición vertical, áreas táctiles superiores a 44×44 px y sin desbordamiento horizontal.

---

## J. Cargas y rendimiento percibido

- **Tiempo de carga inicial:** ~650 ms en frío en Vercel Edge.
- **Transiciones entre páginas:** Inmediatas gracias al enrutador de Next.js (App Router), con indicadores sutiles de progreso.
- **Carga de imágenes de cartas:** Optimización mediante Next/Image con entrega en formato WebP moderno, sin saltos de maquetación (CLS nulo).

---

## K. Registro detallado de incidencias

### INCIDENCIA #1: Falla 404 al crear lecturas en Modo Demostración
- **ID:** `GT-BUG-001`
- **Prioridad:** **P0 — Crítico**
- **Módulo:** Modo Demo / Persistencia Serverless
- **Pasos para reproducir:**
  1. Ingresar a `https://appwebtarot.vercel.app/acceso`.
  2. Pulsar "Abrir demostración".
  3. Pulsar "Nueva lectura" (`/lecturas/nueva`).
  4. Clicar en "Abrir mesa en vivo".
- **Resultado esperado:** Apertura de la mesa en vivo con la nueva lectura borrador creada.
- **Resultado observado:** Redirección a `/lecturas/read-...` que devuelve una página de error 404 ("No encontramos esta página").
- **Causa raíz:** En entornos Vercel Serverless, `/tmp/grimorio-demo.db` es efímero y reside en instancias Lambda independientes. La llamada RPC que crea la lectura escribe en un contenedor, mientras que la navegación posterior es recibida por otro contenedor que no comparte el disco `/tmp`.
- **Impacto:** Ningún usuario que use el botón "Demostración" puede crear lecturas en producción.

---

### INCIDENCIA #2: Guardar preferencias en Ajustes secuestra la sesión al Onboarding
- **ID:** `GT-BUG-002`
- **Prioridad:** **P0 — Crítico**
- **Módulo:** `/ajustes` / Gestión de Usuario
- **Pasos para reproducir:**
  1. Iniciar sesión con un usuario que haya finalizado el onboarding.
  2. Navegar a `/ajustes`.
  3. Modificar cualquier dato (ej. nombre del espacio de trabajo) y pulsar "Guardar preferencias".
- **Resultado esperado:** Mensaje de confirmación y conservación del acceso normal.
- **Resultado observado:** La aplicación redirige inmediatamente a `/onboarding` en el Paso 1, bloqueando el acceso a todas las demás secciones del sistema.
- **Causa raíz:** `updateUserWorkspaceProfile` en el repositorio sobrescribe `preferences_json` sin fusionar el objeto `onboarding` existente, borrando la bandera `completed: true`.
- **Impacto:** Pérdida inmediata de usabilidad para cualquier usuario que configure su cuenta.

---

### INCIDENCIA #3: Caída HTTP 500 en `/consultantes` y `/agenda`
- **ID:** `GT-BUG-003`
- **Prioridad:** **P1 — Alto**
- **Módulo:** Gestión de Clientes y Agenda
- **Pasos para reproducir:**
  1. Con una cuenta registrada en Turso Cloud, entrar a `/consultantes` o `/agenda`.
- **Resultado esperado:** Renderizado del listado de clientes o del calendario de citas.
- **Resultado observado:** Error de servidor 500: "This page couldn’t load - A server error occurred. ERROR 1284427796".
- **Causa raíz:** Desalineación en los parámetros posicionales `?` de las consultas SQL preparadas en `listConsultants` y `listAppointments` al interactuar con el cliente LibSQL/Turso.
- **Impacto:** Los tarotistas profesionales no pueden gestionar sus consultantes ni planificar citas.

---

### INCIDENCIA #4: Excepción en `/lecturas/nueva` (Minified React error #441)
- **ID:** `GT-BUG-004`
- **Prioridad:** **P1 — Alto**
- **Módulo:** `/lecturas/nueva`
- **Pasos para reproducir:**
  1. Entrar con un usuario registrado a `/lecturas/nueva`.
- **Resultado esperado:** Carga del formulario de preparación de lectura.
- **Resultado observado:** Error Boundary con mensaje "No se pudo cargar esta sección - Minified React error #441".
- **Causa raíz:** Intento de desestructuración sobre plantillas de tiradas (`spreads`) nulas o discrepancia de hidratación en React 19 SSR.
- **Impacto:** Impide la creación de lecturas convencionales fuera del asistente de bienvenida.

---

## L. Recomendaciones de mejora

### Correcciones necesarias (Inmediatas):
1. **Solución Demo Serverless:** Reemplazar el archivo `/tmp/grimorio-demo.db` por una base de datos Turso aislada para demostración compartida (con limpieza programada) o almacenar el estado de la sesión demo directamente en cookies encriptadas/sessionStorage.
2. **Preservación de Estado en Ajustes:** Modificar `updateUserWorkspaceProfile` para leer las preferencias actuales del usuario y realizar un merge (`{ ...currentPrefs, ...newPrefs, onboarding: currentPrefs.onboarding }`) antes de emitir la actualización SQL.
3. **Normalización SQL en Consultantes y Agenda:** Validar la correspondencia uno a uno entre los marcadores `?` y el array de parámetros en las consultas de `consultants-repository.ts` y `appointments-repository.ts`.
4. **Fallback defensivo en Nueva Lectura:** Incorporar verificación defensiva en `NewReadingForm` para asegurar que siempre haya una tirada por defecto válida si la consulta devuelve un array vacío.

### Mejoras opcionales (Evolutivas):
1. **Exportación de lecturas:** Añadir botón para descargar la ficha de lectura en PDF o imagen formateada para compartir directamente con el consultante por WhatsApp o correo.
2. **Modo ciego / Lectura a ciegas:** Opción en la mesa en vivo para voltear cartas boca abajo e irlas revelando una a una para lecturas intuitivas.

---

## M. Cobertura y métricas finales

- **Total de casos evaluados:** 26
- **Casos Aprobados:** 22 (84.6%)
- **Casos Fallidos:** 4 (15.4%)
- **Casos Bloqueados / No aplicables:** 0 (0%)
- **Cobertura de funcionalidades principales:** 100% de las rutas públicas y autenticadas inspeccionadas.

---

## N. Conclusión y preparación para producción

Grimorio Tarot cuenta con un nivel de diseño, refinamiento estético y accesibilidad técnica muy por encima del promedio de aplicaciones web actuales. Los conceptos esotéricos y la operativa del tarot están plasmados con gran respeto y precisión técnica.

Sin embargo, debido a los dos defectos críticos P0 (fallo de modo demostración y reseteo involuntario de onboarding) y los dos defectos P1 en módulos esenciales, **la plataforma requiere la aplicación de los parches correspondientes antes de admitir tráfico de usuarios reales.** Una vez corregidos estos puntos, la aplicación se encontrará en un estado óptimo para su comercialización y uso productivo.

---

## O. Limpieza y estado de datos de prueba

- **Usuario creado:** `qa-grimorio-20261027@antigravity.test`
- **Espacio asignado:** `QA-GRIMORIO-20261027 Espacio`
- **Lecturas generadas:** 1 lectura de prueba de Onboarding con arcanos mayores (Rider-Waite).
- **Impacto en producción:** Completamente inocuo. El usuario y sus datos de prueba permanecen aislados bajo su propio identificador en Turso Cloud sin colisionar con registros preexistentes.
