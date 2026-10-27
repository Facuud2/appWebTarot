# Grimorio — Mesa de Trabajo, Agenda y Biblioteca Personal para Tarotistas

**Grimorio** es una aplicación web y PWA profesional diseñada específicamente para tarotistas que trabajan con **mazos físicos en mesa**. Diseñada bajo una filosofía de **privacidad absoluta, soberanía de datos y diseño editorial sereno**, la plataforma elimina la fricción administrativa y cognitiva en consulta, permitiendo registrar lecturas, consultantes, acontecimientos materiales del mazo y reflexiones personales sin romper la concentración del acto adivinatorio.

---

## Índice

1. [Filosofía y Fundamentos del Proyecto](#1-filosofía-y-fundamentos-del-proyecto)
2. [Funcionalidades y Características Totales](#2-funcionalidades-y-características-totales)
3. [Estructura Completa de Archivos e Infraestructura](#3-estructura-completa-de-archivos-e-infraestructura)
4. [Seguridad, Criptografía y Gestión de Sesiones](#4-seguridad-criptografía-y-gestión-de-sesiones)
5. [Configuración de Variables de Entorno (.env.example)](#5-configuración-de-variables-de-entorno-envexample)
6. [Instalación, Desarrollo y Despliegue](#6-instalación-desarrollo-y-despliegue)
7. [Arquitectura de Software y Patrones de Diseño](#7-arquitectura-de-software-y-patrones-de-diseño)

---

## 1. Filosofía y Fundamentos del Proyecto

### ¿Por qué existe Grimorio?
La gran mayoría de aplicaciones de tarot del mercado son simuladores lúdicos con tiradas automáticas mediante números aleatorios. **Grimorio no es un juego ni tira cartas virtuales**: es una **herramienta de trabajo y estudio para practicantes reales** que utilizan barajas físicas sobre un paño de lectura.

### Principios Fundamentales de Diseño e Inclusión:
- **Separación de planos epistemológicos**: Toda tirada separa claramente tres niveles de información:
  1. *El hecho material*: qué carta salió, en qué posición y orientación.
  2. *La interpretación contextual*: qué se le transmitió al consultante durante la sesión.
  3. *El aprendizaje de la tarotista*: reflexiones personales y descubrimientos arquetípicos que pueden sincronizarse con el Grimorio personal para nutrir la práctica a largo plazo.
- **Privacidad y confidencialidad ética (Local-First)**: Los consultantes confían situaciones íntimas (vínculos, duelos, decisiones de vida). Grimorio permite operar con un simple alias o nombre de pila, sin obligar a registrar correos o teléfonos, y con aislamiento estricto por cuenta.
- **Flujo secuencial sin sobrecarga cognitiva**: Al realizar una lectura con una persona sentada enfrente (o en videollamada), un formulario interminable destruye la conexión humana. El flujo secuencial separa la preparación de la sesión (consultante, mazo, tirada, pregunta) de la interacción con las cartas en la mesa interactiva.
- **Estética editorial pastel y anti-slop**: Se descartan interfaces genéricas o saturadas en favor de una paleta con acabados papel lino, carbón suave y acentos pastel atenuados (menta, lavanda, ámbar), integrando tokens de movimiento `transitions-dev` que aportan fluidez y calma visual.

---

## 2. Funcionalidades y Características Totales

### 📖 Grimorio Digital y Catálogo Canónico
- **Catálogo de 78 cartas canónicas**: Arcanos Mayores y Menores con nombres en español e inglés, correspondencias, arquetipos tradicionales, significados al derecho e invertido y palabras clave de búsqueda.
- **Soporte multibaraja y tradiciones**: Rider-Waite-Smith (RWS), Marsella restaurado, Crowley Thoth, Lenormand, Living Wheel, entre otras.
- **Ficha personal por carta y mazo**: Personaliza interpretaciones, símbolos, asociaciones y notas personales por cada mazo que poseas.
- **Historial evolutivo fechado**: Registra la fecha de actualización para comprender cómo madura tu entendimiento de un arcano a través de los años.

### 🃏 Bitácora de Lecturas y Mesa en Vivo
- **Flujo Secuencial Estricto de 2 Pasos**:
  - *Paso 1 (Preparación de la sesión)*: Selección del consultante (o registro rápido de uno nuevo), fecha/hora, selección de mazos a utilizar (con posibilidad de registrar un mazo sobre la marcha), elección de estructura de tirada, pregunta/tema de consulta y notas previas de contexto.
  - *Paso 2 (Mesa interactiva)*: Apertura de la mesa en vivo con selector de cartas en carrusel/lista interactiva estilo iOS, minimapa visual interactivo que resalta la posición actual y formulario con animaciones de transición que emulan el intercambio de cartas.
- **Plantillas de tirada integradas y personalizables**: Tiradas clásicas (Cruz Simple, Cruz Celta, Tres Cartas, Consejo Rápido, Mesa Libre) y creación de estructuras personalizadas con posiciones dinámicas.
- **Autoguardado continuo**: Previene pérdida de datos durante sesiones prolongadas.
- **Exportación en Markdown editorial (`.md`)**: Descarga fichas completas listas para enviar al consultante o archivar.

### ⚡ Observatorio de Fenómenos del Mazo
- Registro en un clic de eventos físicos observables:
  - *Saltó en la mezcla*, *cayó al suelo*, *carta de base*, *revelada en el corte*, *parcialmente oculta*, *giro espontáneo*, *fuera de orden* o *personalizado*.
- Vinculación opcional a una lectura en curso o registro independiente como suceso de estudio personal.
- Separación entre el hecho material observado y la interpretación subjetiva.

### 👥 CRM de Consultantes
- Fichas orientadas a la confidencialidad: operativas con solo un nombre o alias.
- Canales de contacto preferidos (WhatsApp, Telegram, videollamada, presencial) y notas de contexto confidencial.
- Sistema de avatares con tonalidades pastel automáticas diferenciadas.
- Archivado reversible: oculta consultantes inactivos sin perder su histórico de lecturas.
- Historial consolidado: visualización de todas las lecturas y citas asociadas a cada consultante.

### 📅 Agenda de Sesiones y Calendario
- Vistas alternables: lista cronológica de citas y calendario mensual interactivo.
- Modalidades de sesión: presencial, videollamada, llamada telefónica y consulta escrita.
- Vinculación directa: botón para iniciar la lectura directamente desde la cita programada.
- Registro rápido de nuevo consultante integrado en el propio diálogo de agendamiento.

### 🧪 Espacio de Demostración y Portabilidad
- **Modo Demostración en un clic**: Acceso inmediato a *"Mesa de Estudio Sur"* (usuario Clara Valdés) con lecturas, citas, eventos de mazo y consultantes precargados para explorar la aplicación sin registrarse.
- **Soberanía y Respaldos**: Exportación completa de todo el espacio de trabajo en un archivo JSON estructurado e importación con validación estricta Zod.
- **Paleta de Comandos Global (`⌘K` / `Ctrl+K`)**: Acceso rápido a cualquier sección, consultante o carta desde cualquier lugar de la aplicación.
- **Alertas inteligentes temporizadas**: Mensajes de feedback (éxito, error, advertencia) con acentos pastel que desaparecen automáticamente a los 2 segundos.

---

## 3. Estructura Completa de Archivos e Infraestructura

```
appWebTarot/
├── .agents/                          # Habilidades del asistente de IA (skills de UI, anti-slop, etc.)
├── data/                             # Directorio para la base de datos SQLite en desarrollo local
│   └── grimorio.db                   # Archivo SQLite con WAL y claves foráneas habilitadas
├── e2e/                              # Pruebas End-to-End con Playwright
├── public/                           # Recursos estáticos servidos en la raíz
│   ├── icon.svg                      # Icono vectorial oficial del Grimorio
│   └── robots.txt                    # Directivas para rastreadores web
├── scripts/                          # Scripts de soporte y mantenimiento
│   └── export-turso-schema.mjs       # Utilidad para exportar esquema DDL a Turso / libSQL
├── src/
│   ├── actions/                      # Server Actions que enlazan con el cliente RPC tipado
│   │   ├── appointment-actions.ts    # Acciones de citas y agenda
│   │   ├── auth-actions.ts           # Login, registro, demostración y logout
│   │   ├── consultant-actions.ts     # Alta, edición, archivo y baja de consultantes
│   │   ├── grimorio-actions.ts       # Notas de arcanos, mazos y plantillas de tirada
│   │   ├── reading-actions.ts        # Guardado de lecturas, borradores y eventos de mazo
│   │   └── workspace-actions.ts      # Ajustes de perfil, exportación e importación de backup
│   ├── app/                          # Next.js App Router (RSC, layouts y rutas)
│   │   ├── (workspace)/              # Grupo de rutas protegidas bajo AppShell
│   │   │   ├── agenda/page.tsx       # Vista de calendario y lista de citas
│   │   │   ├── ajustes/page.tsx      # Configuración de perfil, mazos y copias de seguridad
│   │   │   ├── consultantes/         # Directorio y ficha detallada de consultantes
│   │   │   │   ├── [id]/page.tsx     # Ficha individual con historial de lecturas
│   │   │   │   └── page.tsx          # Lista general con filtro y archivados
│   │   │   ├── fenomenos/page.tsx    # Observatorio de acontecimientos del mazo
│   │   │   ├── grimorio/             # Catálogo de 78 cartas y notas personales
│   │   │   │   ├── [slug]/page.tsx   # Vista individual de arcano con editor de notas
│   │   │   │   └── page.tsx          # Explorador general con filtros por arcano y palo
│   │   │   ├── lecturas/             # Archivo histórico y creador de tiradas
│   │   │   │   ├── [id]/page.tsx     # Ficha editorial de lectura con exportación Markdown
│   │   │   │   ├── nueva/page.tsx    # Asistente secuencial de nueva lectura y mesa en vivo
│   │   │   │   └── page.tsx          # Archivo histórico de tiradas con búsqueda
│   │   │   ├── error.tsx             # Manejo elegante de errores en el espacio de trabajo
│   │   │   ├── layout.tsx            # Layout con verificación de sesión y snapshot inicial
│   │   │   ├── loading.tsx           # Esqueleto de carga con transiciones suaves
│   │   │   └── page.tsx              # Panel principal (Dashboard, citas de hoy, accesos rápidos)
│   │   ├── acceso/page.tsx           # Pantalla de bienvenida, demostración y autenticación
│   │   ├── api/                      # Endpoints HTTP (Route Handlers)
│   │   │   ├── backup/route.ts       # Exportación e importación del workspace completo (JSON)
│   │   │   ├── rpc/route.ts          # Endpoint RPC unificado para mutaciones y operaciones
│   │   │   └── search/route.ts       # Búsqueda global para la paleta de comandos (⌘K)
│   │   ├── globals.css               # Variables CSS, paleta de colores y estilos base
│   │   ├── layout.tsx                # Layout raíz HTML con tipografías y proveedores
│   │   ├── manifest.ts               # Manifiesto de Aplicación Web Progresiva (PWA)
│   │   ├── not-found.tsx             # Página 404 personalizada con estética editorial
│   │   └── transitions.css           # Tokens y animaciones del sistema transitions-dev
│   ├── components/                   # Componentes de presentación reutilizables
│   │   ├── layout/                   # Componentes estructurales
│   │   │   ├── app-shell.tsx         # Barra lateral en escritorio y navegación táctil inferior en móvil
│   │   │   └── global-command-palette.tsx # Paleta modal de comandos cmdk (⌘K)
│   │   ├── providers/                # Envoltorios de contexto
│   │   │   └── app-providers.tsx     # Proveedor de tema (next-themes) y notificaciones Sonner
│   │   ├── shared/                   # Componentes específicos del dominio de tarot
│   │   │   ├── consultant-avatar.tsx # Avatar con tono pastel aleatorio y accesible
│   │   │   ├── spread-map.tsx        # Representación gráfica espacial de la tirada
│   │   │   └── tarot-card-plate.tsx  # Placa visual de la carta con orientación y arcano
│   │   └── ui/                       # Primitivas atómicas accesibles (Radix UI)
│   │       ├── alert-dialog.tsx      # Diálogos de confirmación destructiva
│   │       ├── badge.tsx             # Etiquetas informativas estilizadas
│   │       ├── button.tsx            # Botones con variantes primarias, secundarias y ghost
│   │       ├── calendar.tsx          # Calendario para date pickers
│   │       ├── card-combobox.tsx     # Selector autocompletable para las 78 cartas
│   │       ├── checkbox.tsx          # Casillas de verificación
│   │       ├── date-picker.tsx       # Selector de fecha emergente
│   │       ├── datetime-picker.tsx   # Selector de fecha y hora para citas
│   │       ├── dialog.tsx            # Ventanas modales centradas
│   │       ├── input.tsx             # Campos de texto estilizados
│   │       ├── label.tsx             # Etiquetas de formulario accesibles
│   │       ├── popover.tsx           # Elementos desplegables flotantes
│   │       ├── sheet.tsx             # Paneles laterales deslizables (cajones)
│   │       ├── skeleton.tsx          # Marcadores de posición animados
│   │       ├── tabs.tsx              # Pestañas de navegación
│   │       ├── tag-input.tsx         # Entrada interactiva de etiquetas
│   │       └── textarea.tsx          # Áreas de texto multilínea
│   ├── features/                     # Componentes interactivos organizados por módulo de dominio
│   │   ├── agenda/                   # Gestión interactiva de citas y calendario
│   │   │   ├── agenda-view-client.tsx
│   │   │   └── appointment-form-dialog.tsx
│   │   ├── auth/                     # Formularios de acceso, registro y demo
│   │   │   └── auth-panel.tsx
│   │   ├── consultants/              # Gestión de consultantes y expedientes
│   │   │   ├── consultant-dossier-actions.tsx
│   │   │   ├── consultant-form-dialog.tsx
│   │   │   └── consultants-directory-client.tsx
│   │   ├── grimorio/                 # Navegación del catálogo y editor de significados
│   │   │   ├── card-detail-editor.tsx
│   │   │   └── grimorio-browser-client.tsx
│   │   ├── readings/                 # Creación, mesa interactiva y archivo de tiradas
│   │   │   ├── deck-event-sheet.tsx
│   │   │   ├── live-reading-workbench.tsx
│   │   │   ├── new-reading-form.tsx
│   │   │   ├── phenomena-observatory-client.tsx
│   │   │   └── readings-archive-client.tsx
│   │   └── settings/                 # Configuración de perfil y exportación/importación
│   │       └── settings-client.tsx
│   ├── lib/                          # Utilidades universales y datos estáticos
│   │   ├── catalogs/                 # Catálogos de arcanos por tradición histórica
│   │   │   ├── lenormand.ts
│   │   │   ├── living-wheel.ts
│   │   │   ├── marseille.ts
│   │   │   ├── rws.ts
│   │   │   └── thoth.ts
│   │   ├── constants.ts              # Constantes globales, opciones y temas
│   │   ├── rpc-client.ts             # Cliente HTTP tipado para invocar op en /api/rpc
│   │   ├── tarot-catalog.ts          # Definición de las 78 cartas canónicas y 5 tiradas
│   │   └── utils.ts                  # Utilidad clsx / tailwind-merge (cn)
│   ├── repositories/                 # Capa de Acceso a Datos (consultas SQL relacionales)
│   │   ├── appointments-repository.ts
│   │   ├── consultants-repository.ts
│   │   ├── grimorio-repository.ts
│   │   ├── readings-repository.ts
│   │   ├── tags-repository.ts
│   │   └── users-repository.ts
│   ├── schemas/                      # Validación runtime de formularios y payloads
│   │   └── domain.ts                 # Esquemas Zod para entidades, inputs y filtros
│   ├── server/                       # Módulos exclusivos del servidor (server-only)
│   │   ├── crypto-auth.ts            # Hashing scrypt, HMAC SHA-256 y timingSafeEqual
│   │   ├── db.ts                     # Instanciación de SQLite (node:sqlite), esquema DDL y migraciones
│   │   └── session.ts                # Sesiones autocontenidas y lectura/escritura de cookies
│   ├── tests/                        # Pruebas automatizadas con Vitest
│   │   ├── auth-flow.test.ts         # Integración de login, registro, demo y cookies
│   │   ├── components.test.tsx       # Pruebas de renderizado de componentes clave
│   │   ├── repositories.test.ts      # Pruebas de consultas SQL sobre BD en memoria
│   │   ├── server-only-stub.ts       # Stub para simular paquete server-only en pruebas
│   │   └── setup.ts                  # Configuración global del entorno de tests
│   └── types/                        # Definiciones de tipos TypeScript del modelo de dominio
│       └── domain.ts
├── .env.example                      # Plantilla explicada de variables de entorno
├── .env.production.sample            # Ejemplo de configuración para producción en Vercel
├── .gitignore                        # Archivos excluidos del control de versiones
├── eslint.config.mjs                 # Configuración de ESLint con reglas para Next.js y React
├── next.config.ts                    # Configuración de compilación Next.js
├── package.json                      # Scripts del proyecto y dependencias
├── playwright.config.ts              # Configuración de pruebas de extremo a extremo
├── postcss.config.mjs                # Configuración de PostCSS para Tailwind CSS v4
├── README.md                         # Documentación técnica integral
├── tsconfig.json                     # Configuración estricta de TypeScript
├── turso-schema.sql                  # DDL completo compatible con Turso / libSQL
└── vercel.json                       # Configuración de despliegue y variables para Vercel
```

---

## 4. Seguridad, Criptografía y Gestión de Sesiones

### Arquitectura de Sesiones Sin Estado (Stateless HMAC Payload)
En plataformas de computación Serverless como **Vercel**, las funciones ejecutan peticiones en contenedores efímeros independientes (Lambdas). Un enfoque clásico de sesiones basado en consultar una tabla SQLite local falla porque la petición que hace el login (`POST /api/rpc`) se ejecuta en una instancia con su propio almacenamiento temporal, mientras que la siguiente petición de navegación (`GET /`) aterriza en una instancia distinta con un disco `/tmp` en blanco.

Para resolver este desafío de raíz con máxima seguridad:
1. **Token Autocontenido con Firma Criptográfica**: Al autenticarse, el servidor genera un payload que incluye la identidad básica y preferencias del usuario (`userId`, `email`, `name`, `workspaceName`, `isDemo`, `preferences`, `exp`).
2. **Firma HMAC SHA-256**: El payload se codifica en Base64URL y se firma con `SESSION_SECRET` mediante HMAC SHA-256. El token resultante tiene el formato `payloadB64.firmaHMAC`.
3. **Verificación Universal entre Lambdas**: Cualquier instancia que reciba la cookie valida la firma en microsegundos usando `timingSafeEqual`. Si la firma coincide y no ha expirado, el usuario es admitido instantáneamente **sin necesidad de consultas a una base de datos central de sesiones**.
4. **Resiliencia Relacional Automática**: Al validar la sesión en una nueva Lambda, la aplicación asegura de forma transparente la existencia del usuario y sus mazos base en la base de datos de esa instancia (`INSERT OR IGNORE`), garantizando que las claves foráneas de SQLite funcionen sin inconsistencias.

### Protección de Cookies
- **`HttpOnly: true`**: La cookie no puede ser leída ni manipulada mediante scripts de JavaScript en el navegador, mitigando ataques de tipo Cross-Site Scripting (XSS).
- **`SameSite: "lax"`**: Previene ataques de falsificación de peticiones en sitios cruzados (CSRF) mientras permite la navegación directa natural desde enlaces externos.
- **`Secure: true` en producción**: Detecta automáticamente el encabezado `x-forwarded-proto: https` emitido por proxies reversos y balanceadores de carga para forzar la transmisión exclusiva bajo cifrado TLS/HTTPS.
- **`Max-Age` y expiración explícita**: Configurada a 30 días con renovación controlada.

### Criptografía de Contraseñas
- **Algoritmo `scrypt`**: Las contraseñas de cuentas privadas se derivan usando la función criptográfica nativa `scryptSync` con sales criptográficas de 16 bytes generadas con `randomBytes`.
- **Mitigación de ataques de tiempo (`timingSafeEqual`)**: La comparación de hashes se realiza en tiempo constante para evitar ataques de canal lateral (*timing attacks*).

---

## 5. Configuración de Variables de Entorno (.env.example)

Crea tu archivo `.env.local` duplicando `.env.example`:

```bash
cp .env.example .env.local
```

### Contenido detallado del archivo `.env.example`:

```bash
# ==============================================================================
# GRIMORIO TAROT - VARIABLES DE ENTORNO (PLANTILLA OFICIAL)
# ==============================================================================
# Para DESARROLLO LOCAL: Copia este archivo a `.env.local`
# Para PRODUCCIÓN EN VERCEL: Configura estas variables en Vercel Dashboard
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. SEGURIDAD DE AUTENTICACIÓN (REQUERIDO)
# ------------------------------------------------------------------------------
# Clave criptográfica para firmar cookies de sesión mediante HMAC SHA-256.
# En producción DEBE tener al menos 32 caracteres para garantizar entropía.
# Genera una clave segura ejecutando en tu terminal:
# openssl rand -base64 32
SESSION_SECRET="reemplazar-por-clave-secreta-de-al-menos-32-caracteres-en-produccion"

# En entornos de producción (HTTPS), mantener en true para exigir el flag Secure
FORCE_SECURE_COOKIE="true"

# ------------------------------------------------------------------------------
# 2. BASE DE DATOS LOCAL (SQLite en tu máquina para desarrollo)
# ------------------------------------------------------------------------------
# Ruta donde se almacena la base de datos SQLite localmente.
# En Vercel Serverless, el sistema redirige automáticamente a /tmp/grimorio.db
GRIMORIO_DB_PATH="./data/grimorio.db"

# ------------------------------------------------------------------------------
# 3. BASE DE DATOS EN LA NUBE: TURSO / LIBSQL (OPCIONAL PARA DISTRIBUCIÓN)
# ------------------------------------------------------------------------------
# URL obtenida al crear tu base en Turso CLI:
#   turso db create grimorio-db
#   turso db show grimorio-db --url
# Formato: libsql://grimorio-db-[tu-usuario].turso.io
TURSO_DATABASE_URL=""

# Token de autenticación de Turso obtenido con:
#   turso db tokens create grimorio-db
TURSO_AUTH_TOKEN=""
```

---

## 6. Instalación, Desarrollo y Despliegue

### Requisitos Previos
- **Node.js**: `>= 22.5.0` (incluye el módulo nativo `node:sqlite`). Probado y verificado en Node `v26.11.1`.
- **npm**: `>= 10.x`.

### Instalación de dependencias
```bash
npm install
```

### Comandos de Ejecución y Verificación

| Comando | Acción |
| --- | --- |
| `npm run dev` | Inicia el servidor de desarrollo local con Turbopack en `http://localhost:3000` |
| `npm run typecheck` | Comprueba tipos estrictos de TypeScript (`next typegen && tsc --noEmit`) |
| `npm run lint` | Ejecuta el análisis estático de código con ESLint |
| `npm test` | Ejecuta la suite de pruebas unitarias y de integración con Vitest |
| `npm run build` | Compila la aplicación optimizada para producción |
| `npm run start` | Inicia el servidor en modo producción local |
| `npm run test:e2e` | Ejecuta las pruebas automatizadas de extremo a extremo con Playwright |

### Despliegue en Vercel
1. Conecta tu repositorio de GitHub o GitLab con Vercel.
2. En la configuración del proyecto en Vercel (*Settings > Environment Variables*), agrega:
   - `SESSION_SECRET`: Una clave aleatoria segura de al menos 32 caracteres.
   - `FORCE_SECURE_COOKIE`: `true`.
3. Despliega la rama `main` o haz `git push`. La aplicación compilará automáticamente usando Turbopack.

---

## 7. Arquitectura de Software y Patrones de Diseño

### 1. Patrón RPC Unificado (`/api/rpc`)
En lugar de dispersar decenas de endpoints REST tradicionales (`POST /api/consultants`, `PUT /api/appointments/123`, etc.), la aplicación implementa un patrón **Remote Procedure Call (RPC)** tipado:
- El cliente invoca `callRpc<T>("operacion.nombre", payload)` a través de Server Actions.
- La ruta `/api/rpc/route.ts` recibe un sobre `{ op, payload }`, valida el payload con el esquema Zod correspondiente y ejecuta el repositorio pertinente en un único punto protegido.
- Beneficios: Cero discrepancias de tipos entre cliente y servidor, manejo unificado de errores y auditoría simplificada de mutaciones.

### 2. Motor Relacional Nativo `node:sqlite` (`DatabaseSync`)
- Cero dependencias externas en C++ pesadas (`better-sqlite3` que requieren compilación de binarios nativos con `node-gyp`). Se utiliza la API síncrona nativa de Node.js `DatabaseSync`.
- **Modo WAL (`Write-Ahead Logging`)**: Proporciona alta concurrencia en lecturas concurrentes sin bloquear escrituras.
- **Claves Foráneas activadas (`PRAGMA foreign_keys = ON`)**: Asegura eliminación en cascada (`ON DELETE CASCADE`) y desvinculación segura (`ON DELETE SET NULL`) para integridad referencial.
- **Fallback dinámico en Serverless**: Si la ruta configurada no tiene permisos de escritura (como el sistema de archivos de solo lectura `/var/task` en Vercel), el motor detecta el entorno y utiliza automáticamente `/tmp/grimorio.db`.

### 3. Sistema de Transiciones y Microinteracciones (`transitions-dev`)
- Para evitar que la interfaz se perciba estática o tosca, se implementó el sistema de tokens de movimiento de `transitions-dev` (`src/app/transitions.css`).
- Diálogos modales con escala elástica, paneles laterales con deslizamiento suave, animaciones de intercambio de cartas en la mesa interactiva y tarjetas con respuesta táctil inmediata que guían la atención del usuario de manera orgánica.

### 4. Accesibilidad y Compatibilidad PWA
- Totalmente navegable mediante teclado y lectores de pantalla gracias a primitivas de Radix UI.
- Manifiesto web en `src/app/manifest.ts` que permite instalar la aplicación en dispositivos móviles (iOS / Android) o en el escritorio para una experiencia inmersiva a pantalla completa junto al paño de tarot.
