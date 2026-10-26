# Grimorio — Agenda, bitácora de lecturas y biblioteca personal para tarotistas

**Grimorio** es una aplicación web profesional en español concebida como instrumento de acompañamiento para tarotistas que trabajan con **mazo físico en mesa**. Combina en un solo espacio privado:

1. **Grimorio digital de las 78 cartas**: referencia tradicional de solo lectura separada estrictamente de tus interpretaciones personales, asociaciones simbólicas, mazos físicos, plantillas espaciales de tirada e historial evolutivo fechado de cómo cambia tu comprensión de cada arcano con el tiempo.
2. **Bitácora de lecturas en vivo y de archivo**: registro progresivo durante la sesión real sobre el paño, separando tres planos epistemológicos explícitos (*1. Observación física en mesa*, *2. Contexto e interpretación en la sesión*, *3. Aprendizaje personal sincronizable con el Grimorio*), autoguardado opcional, vista de ficha editorial e impresión / exportación en Markdown (`.md`).
3. **Observatorio de acontecimientos físicos del mazo**: documentación rápida en un clic de circunstancias materiales observables (*saltó en la mezcla*, *cayó fuera de la mesa*, *quedó en la base*, *apareció al cortar*, *parcialmente oculta*, *girada espontáneamente*, *fuera de orden* u *otra*), separando siempre el hecho fenomenológico de la interpretación opcional de la tarotista.
4. **CRM personal y agenda de sesiones**: fichas de consultantes orientadas a privacidad (operativas con un simple alias, sin exigir datos de contacto), archivado reversible, confirmaciones en acciones destructivas, agenda cronológica + calendario mensual e inicio de lectura en un clic desde cualquier cita.
5. **Soberanía de datos y multiusuario**: cuentas privadas con aislamiento estricto por usuario (`user_id`), modo demostración explícito (`clara@grimorio.local`), exportación completa en JSON estructurado e importación validada con Zod.

---

## Stack tecnológico

- **Framework**: Next.js `16.x` (App Router, Server Components, Server Actions, Route Handlers) + React `19.x`
- **Lenguaje**: TypeScript `6.0` en modo estricto (`"strict": true`, `"allowJs": false`, cero `any`)
- **Estilos y UI**: Tailwind CSS `v4`, sistema de diseño editorial (*Instrument Sans* + *Instrument Serif*, modo papel lino claro y carbón nocturno con `next-themes`), primitivas accesibles sobre `radix-ui` unificado, paleta global de comandos con `cmdk` (`⌘K` / `Ctrl+K`), iconos `lucide-react` y notificaciones honestas con `sonner`
- **Formularios y validación**: `react-hook-form` + `zod` (`v4`) + `@hookform/resolvers`
- **Persistencia relacional**: SQLite nativo de Node.js (`node:sqlite` / `DatabaseSync`) en modo WAL con claves foráneas e integridad transaccional tras una capa limpia de repositorios tipados (`src/repositories/*`)
- **Pruebas**: Vitest + React Testing Library (`jsdom` + integración SQL en memoria `:memory:`) y suite E2E con Playwright

---

## Requisitos y variables de entorno

- **Node.js** `>= 22.5` (verificado sobre Node `v26.11.1` con `node:sqlite` integrado) y **npm**.
- Copia `.env.example` a `.env.local` si deseas personalizar la ruta del archivo SQLite o el secreto de firma de sesión:

```bash
cp .env.example .env.local
```

| Variable | Por defecto en desarrollo | Propósito |
| --- | --- | --- |
| `GRIMORIO_DB_PATH` | `./data/grimorio.db` | Ruta del archivo SQLite relacional local |
| `GRIMORIO_SESSION_SECRET` | Secreto local de desarrollo | Clave HMAC-SHA256 para firmar cookies de sesión `HttpOnly` |

> La base de datos `./data/grimorio.db`, el catálogo canónico de las 78 cartas, las 5 plantillas clásicas de tirada y el espacio de demostración se inicializan automáticamente en el primer arranque sin requerir servicios externos.

---

## Comandos principales

```bash
# Instalar dependencias (manteniendo npm y package-lock.json)
npm install

# Iniciar servidor de desarrollo (http://localhost:3000)
npm run dev

# Verificar tipos estrictos (Next typegen + tsc --noEmit)
npm run typecheck

# Ejecutar análisis estático ESLint
npm run lint

# Ejecutar suite de pruebas unitarias, de componentes y repositorios SQLite
npm test

# Compilar build de producción
npm run build

# Servir build de producción
npm run start

# Ejecutar pruebas E2E con Playwright (requiere binario de navegador instalado)
npm run test:e2e
```

---

## Arquitectura multiplataforma: Web, PWA y evolución a Escritorio

1. **Web responsiva y PWA instalable**: incluye `src/app/manifest.ts` e icono vectorial editorial (`public/icon.svg`) para instalarse desde navegadores móviles o de escritorio y operar a pantalla completa junto al paño de lectura, con navegación inferior táctil en móvil y barra lateral abierta en escritorio.
2. **Portabilidad a aplicación de escritorio (Electron / Tauri) o la nube**: toda la lógica de persistencia vive exclusivamente detrás de `src/repositories/*` y `src/server/db.ts` (`server-only`), permitiendo empaquetar el servidor Next.js standalone junto al archivo SQLite local en Electron, o reemplazar el adaptador SQLite por PostgreSQL/Supabase manteniendo intactos los esquemas Zod, acciones y vistas.
