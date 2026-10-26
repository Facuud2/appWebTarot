# 🎨 Protocolo de Diseño Frontend Anti-Slop (UI/UX Pro Max + Transitions + Taste Skill + Web Artifacts)

Este protocolo es obligatorio para cualquier tarea de diseño, maquetación, creación o ajuste de interfaces frontend interactivas en el proyecto y en la generación de artefactos web.

---

## 🎯 Objetivo y Filosofía
Evitar la trampa común de los modelos de IA generativa que producen interfaces genéricas ("AI slop": titulares centrados de 3 líneas con badges pequeños, degradados violetas cliché, sombras flotantes pesadas en reposo, textos en monospace indiscriminados y métricas ficticias).

El diseño debe nacer con **fundamentos interactivos sólidos y ergonomía** (**UI/UX Pro Max** y **Web Artifacts Builder**), cobrar vida con **micro-interacciones fluidas y tokens de movimiento estandarizados** (**Transitions Dev** y **Transitions Polish**), y ser auditado rigurosamente (**Design Taste Frontend**) antes de darse por completado.

---

## 🔁 Flujo Obligatorio de Tres Etapas

```
[Requerimiento de Diseño o Componente Frontend]
           │
           ▼
┌────────────────────────────────────────────────────────┐
│ FASE 1: Construcción e Inteligencia de Diseño          │
│ Skills: ui-ux-pro-max + web-artifacts-builder          │
│ • Determinar stack: Next.js/React 19/Tailwind v4 o     │
│   artefacto autocontenido HTML.                        │
│ • Conectar a tokens semánticos del sistema de diseño   │
│   (globals.css / theme.json / variables semánticas):   │
│   --ground, --surface, --raised, --border, --text,     │
│   --muted, --primary, --accent.                        │
│ • Ergonomía interactiva (hitbox >= 44px en botones).   │
│ • Tipografía con intención y contenido con sustancia.  │
└────────────────────────────────────────────────────────┘
           │
           ▼ (Estructura y layout listos)
┌────────────────────────────────────────────────────────┐
│ FASE 2: Movimiento y Micro-interacciones               │
│ Skills: transitions-dev + transitions-polish           │
│ • Aplicar recetas `t-*` o sincronizar Framer/Motion:   │
│   - Dropdowns y Menús: `05-menu-dropdown`              │
│   - Diálogos y Modales: `06-modal`                     │
│   - Segmented Tabs / Controles: `16-tabs-sliding`      │
│   - Cargas y Skeletons: `14-skeleton-reveal`, shimmer  │
│ • Tokenizar tiempos y curvas con la escala oficial:    │
│   - Open: 250ms (--duration-fast)                      │
│   - Close: 150ms (--duration-quick) [Asimetría open/close]
│   - Easing estándar: cubic-bezier(0.22, 1, 0.36, 1)    │
│ • Guardia obligatoria: `prefers-reduced-motion`.       │
└────────────────────────────────────────────────────────┘
           │
           ▼ (Interfaz animada y funcional)
┌────────────────────────────────────────────────────────┐
│ FASE 3: Auditoría Anti-Slop y Desintoxicación          │
│ Skill: design-taste-frontend                           │
│ • Ejecutar linter anti-slop sobre el código generado:  │
│   node ~/.agents/skills/design-taste-frontend/scripts/lint.mjs <rutas>
│ • Eliminar "tells" detectados:                         │
│   - Sin degradados violetas o sombras flotantes fake   │
│   - Sin números decorativos (01 / 02) sin propósito    │
│   - Sin monospace en texto regular                     │
│   - Sustituir ornamentos vacíos por sustancia real     │
│ • Bucle Look-and-Fix hasta 0 fallos (0 FAIL).          │
└────────────────────────────────────────────────────────┘
           │
           ▼
[Fin del Flujo: Interfaz Funcional, Ergonómica y Libre de Slop]
```

---

## 📦 Artefactos de Antigravity
Cuando se generen prototipos visuales interactivos para Antigravity:
1. Usar `web-artifacts-builder` para compilar componentes React + Tailwind + Radix en un único `.html`.
2. Guardar en el directorio de artefactos (`write_to_file` con `ArtifactMetadata`).
3. Para previsualizaciones inline en el chat, embeber mediante:
   `<agent-embed src="file:///<artifact_path>/<nombre>.html"></agent-embed>`
