---
name: TUTN
description: La guía definitiva de la facultad — material, foro y horarios para estudiantes de UTN FRC
colors:
  primary: "#1f387e"
  accent-teal: "#c5e5e4"
  surface-paper: "#fafaf8"
  surface-white: "#ffffff"
  surface-wash: "#f5f5f3"
  border-default: "#e8e8e4"
  border-subtle: "#f0f0ee"
  text-primary: "#111827"
  text-body: "#374151"
  text-secondary: "#6b7280"
  text-muted: "#9ca3af"
  danger: "#e05555"
  success: "#5a9e6f"
typography:
  display:
    fontFamily: "Inter, Arial, Helvetica, sans-serif"
    fontSize: "clamp(4rem, 7vw, 6rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Inter, Arial, Helvetica, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, Arial, Helvetica, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, Arial, Helvetica, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, Arial, Helvetica, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  2xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.full}"
    padding: "7px 18px"
  button-primary-hover:
    backgroundColor: "#162d4a"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.full}"
    padding: "7px 18px"
  button-ghost:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.primary}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-ghost-hover:
    backgroundColor: "#f0f4ff"
    textColor: "{colors.primary}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  tag-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.full}"
    padding: "9px 22px"
  tag-inactive:
    backgroundColor: "{colors.surface-paper}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: "9px 22px"
  input-default:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
---

# Design System: TUTN

## 1. Overview

**Creative North Star: "La Guía Definitiva de la Facultad"**

TUTN is built on the metaphor of the definitive handbook: the well-indexed, dog-eared guide that students pass between themselves because it actually has the answers. Not the official syllabus nobody reads, not a consumer app dressed up in a university logo. A reliable reference that respects the user's time and intelligence.

The interface is information-first. Density is a virtue when it means less clicking, not more clutter. Every element either helps a student find something — material, a classmate's question, a free slot in the schedule — or gets out of the way. The palette is restrained: one deep blue anchors trust, everything else is paper and ink. Decoration earns its place by serving function; ornamentation that doesn't carry meaning is prohibited.

The voice is Argentine: direct, informal, voseo throughout. The app speaks like the student next to you who actually knows the campus, not like an institution trying to sound approachable.

**Key Characteristics:**
- Azul Pizarrón is the single trust anchor; everything else is near-neutral
- Paper-toned backgrounds (warm off-white) reduce eye strain during long study sessions
- Flat elevation: borders divide space, shadows are reserved for true modal overlays
- Pill-shaped tags for multi-select cascades; radius shrinks as components grow in visual weight
- Dense but breathable information layout — rhythm through varied spacing, not uniform padding

## 2. Colors: The Azul Pizarrón Palette

A near-monochromatic palette built around one deep institutional blue and a family of warm papers. The teal accent exists as a kinetic moment only — never static.

### Primary
- **Azul Pizarrón** (`#1f387e`): The chalkboard blue that anchors every trust signal in the system. Primary buttons, active tag states, the brand logotype, structural links. The only saturated color that appears statically on the surface.

### Secondary
- **Birome Turquesa** (`#c5e5e4`): A desaturated teal used exclusively in motion — as the hover-fill circle on the landing CTA. Never used as a static surface or text color. If you find yourself reaching for it outside an animation, stop.

### Neutral
- **Papel Cuadriculado** (`#fafaf8`): The default app background. Warm off-white with a barely-perceptible cool tint — lighter than cream, warmer than paper-white. The ground the content sits on.
- **Blanco Limpio** (`#ffffff`): Elevated surfaces: card backgrounds, the navbar, modal panels. Sits visibly above Papel Cuadriculado without a shadow.
- **Lavado de Estudio** (`#f5f5f3`): Login page background and secondary section washes. Slightly cooler than Papel Cuadriculado.
- **Línea de Carpeta** (`#e8e8e4`): Default border and divider color. Every card border, input border, and section separator uses this value.
- **Línea Sutil** (`#f0f0ee`): Hairline dividers between form sections. Below visual threshold as a separator, present as a rhythm marker.
- **Tinta Oscura** (`#111827`): Primary text — headings and labels that carry structural hierarchy.
- **Grafito** (`#374151`): Body text on light surfaces.
- **Polvo de Tiza** (`#6b7280`): Supporting metadata: email addresses, dates, subdued context labels.
- **Lápiz Gris** (`#9ca3af`): Placeholders, disabled text, section eyebrow labels. Never used for body copy.
- **Rojo Parcial** (`#e05555`): Danger states, destructive action text, error messages. The color of a failed exam — used sparingly and never decoratively.
- **Verde Aprobado** (`#5a9e6f`): Success states and confirmation messages. Not used decoratively.

### Named Rules

**La Regla del Único Acento.** Azul Pizarrón is the only color that appears statically on more than 10% of any surface. Birome Turquesa lives only in motion. If you're adding a second static accent, you're adding noise to a system built on restraint.

**La Regla del Papel.** Backgrounds are warm off-whites, never pure `#ffffff` at the page level. Pure white is reserved for elevated surfaces (cards, modals, the navbar). The contrast between Papel Cuadriculado and Blanco Limpio creates tonal depth without shadows.

## 3. Typography

**Primary Font:** Inter (with Arial, Helvetica, sans-serif fallback)

**Character:** Inter's humanist geometry feels technical without being cold — the right register for a tool used in engineering faculties. At display scale, extreme weight (800) and tight tracking (−0.04em) give it authority without formality.

### Hierarchy
- **Display** (800 weight, `clamp(4rem, 7vw, 6rem)`, line-height 1): The TUTN logotype on the landing. One use in the entire product. Tight negative tracking (−0.04em) makes it feel like a stamp, not a wordmark.
- **Headline** (700 weight, 22px, line-height 1.2): Page titles, profile usernames, section headers. Slight negative tracking (−0.02em) keeps it crisp at small sizes.
- **Title** (600 weight, 16px, line-height 1.35): Card headings, post titles, section leads. The primary reading entry point in list interfaces.
- **Body** (400 weight, 14px, line-height 1.55): All prose — post bodies, descriptions, form help text. Maximum line length 65–75ch.
- **Label** (700 weight, 11px, line-height 1.2, letter-spacing 0.08em, uppercase): Section eyebrows, form field labels, stat captions. Always uppercase with wide tracking. Never more than 4–5 words.

### Named Rules

**La Regla del Pizarrón.** Labels and eyebrows are always uppercase with wide tracking (0.07–0.1em). This is the one place all-caps is permitted. Body text, headings, and buttons are never all-caps.

**La Regla de la Línea.** Prose content is capped at 65–75 characters per line. The container constrains itself on wide screens; the line never stretches full-width.

## 4. Elevation

TUTN is a flat system. Surfaces are differentiated by color, not by shadow. `border: 1px solid #e8e8e4` is the primary depth signal — it separates cards from backgrounds, inputs from their containers, and sections from each other.

The one exception is the modal overlay: SearchModal and FiltroPanel use a single ambient shadow to lift them above the rest of the interface. This shadow is the system's only shadow. Its rarity is what makes it work.

### Shadow Vocabulary
- **Ambient Modal** (`box-shadow: 0 24px 60px rgba(0, 0, 0, 0.18)`): Exclusive to modal dialogs. Never on cards, inputs, or nav elements.

### Named Rules

**La Regla Plana.** If a surface is not a modal, it does not get a shadow. Tonal color shifts (Papel Cuadriculado to Blanco Limpio) handle depth at page level. Borders handle depth at component level.

## 5. Components

### Buttons

The button hierarchy is expressed through shape: pills (`9999px`) for primary in-page actions; border-radius lg (12px) for ghost/secondary actions; flat text for destructive or low-priority actions. Shape encodes urgency.

- **Shape:** Pills for primary; gently curved (12px) for ghost and secondary
- **Primary:** Azul Pizarrón background, white text, 7px 18px padding, 14px 700 weight. Hover darkens to `#162d4a`.
- **Ghost:** White background, Azul Pizarrón text, 1.5px border (`#d0d9f0`), 12px radius. Hover fills with `#f0f4ff`. Used for secondary surface actions.
- **Danger:** No background, Rojo Parcial text (`#e05555`). Flat text button only — never pill-shaped.
- **Focus:** Global `outline: 2px solid #2563eb; outline-offset: 2px` — never suppressed.
- **Disabled:** `opacity: 0.5; cursor: not-allowed`. No special styling beyond that.

### Tags / Filter Chips

The primary cascade navigation primitive (Carrera → Año → Materia) and content filter. Pill-shaped, binary toggle — no intermediate state.

- **Inactive:** Papel Cuadriculado background, Azul Pizarrón text, 1.5px border (`#e8e8e4`), pill radius, 9px 22px padding, 13.5px 600 weight. Hover shifts border to `#a0b0d8`.
- **Active:** Azul Pizarrón fill, white text, same shape. Filled state is self-describing — no extra indicator needed.

### Cards / Containers

Used for file results, stats panels, profile sections, login containers. Always flat with 1px `#e8e8e4` border on white surface.

- **Corner Style:** Gently curved — 12px standard, 16px for larger containing panels
- **Background:** Blanco Limpio (`#ffffff`) on Papel Cuadriculado (`#fafaf8`)
- **Shadow Strategy:** None. See Elevation.
- **Border:** 1px solid Línea de Carpeta (`#e8e8e4`)
- **Internal Padding:** 20px (file cards), 24–28px (section panels). Varies for visual rhythm.

### Inputs / Fields

- **Style:** 1.5px border (`#e8e8e4`), white background, 12px radius, 12px 16px padding
- **Focus:** Border shifts to Azul Pizarrón (`#1f387e`). Clean color transition only — no glow, no ring inside the field.
- **Error:** Border shifts to Rojo Parcial (`#e05555`). Error message below field in the same color, 12px body.
- **Disabled:** `opacity: 0.6; background: #fafaf8; cursor: not-allowed`

### Navigation

Fixed 56px bar — white background, 1px bottom border.

- **Default link:** 14px 500 weight, Grafito text (`#374151`), no underline
- **Hover / Active:** Azul Pizarrón text. No background shift on desktop.
- **Mobile:** Hamburger toggle at 9×9 button, reveals stacked links in a rounded `#f9fafb` panel. Avatar and logout below a divider at the list bottom.

### Vote Control (Signature Component)

The foro voting interface: compact icon buttons flanking a live numeric score.

- **Default:** 16px triangle SVG, `#878a8c` color, transparent background
- **Active (upvote):** Icon and score shift to Azul Pizarrón
- **Active (downvote):** Icon and score shift to Rojo Parcial
- **Score:** Updates live via `aria-live="polite" aria-atomic="true"` — this is a functional requirement, not optional.
- **Disabled (logged out):** `opacity: 0.5; cursor: not-allowed`. `aria-label` explains why.

## 6. Do's and Don'ts

### Do:
- **Do** use Azul Pizarrón as the single accent. Its rarity on a given surface is what makes it trustworthy.
- **Do** use pill-shaped buttons (`border-radius: 9999px`) for primary in-page actions only.
- **Do** write labels, form eyebrows, and stat captions in uppercase with wide tracking (0.07–0.1em). This is the only permitted use of all-caps.
- **Do** differentiate surface depth with color tones (Papel Cuadriculado → Blanco Limpio → modal), not shadows.
- **Do** write in voseo: "Iniciá sesión", "Buscás", "Subí material", "Elegí tu avatar". The interface is Argentine, always.
- **Do** keep body text under 70ch per line.
- **Do** use `border: 1px solid #e8e8e4` as the primary spatial separator between components.
- **Do** animate only `transform`, `opacity`, and `color`. Never animate `width`, `height`, `top`, `left`, or `padding`.
- **Do** include the `aria-live` + `aria-atomic` pair on any value that updates without user action (vote scores, counters, status messages).

### Don't:
- **Don't** use gradients on hero sections, button backgrounds, or cards. This is the most visible tell of the anti-reference: estética SaaS genérica de Silicon Valley.
- **Don't** build 2×2 grids of identical cards with big numbers and uppercase labels. This is the banned hero-metric template. Rethink the information structure before reaching for it.
- **Don't** add a second static saturated accent color. Birome Turquesa is for motion only.
- **Don't** add `box-shadow` to anything that is not a modal overlay.
- **Don't** imitate institutional education platforms — Coursera, Moodle, or apps universitarias argentinas oficiales. Their visual signatures (heavy nav, corporate blue on white, grid of course cards, three-page forms) are what this system was built against.
- **Don't** use all-caps for buttons, headings, or body copy. Label role only.
- **Don't** suppress the focus ring. The global `:focus-visible` outline is a design element. Removing it breaks keyboard users.
- **Don't** use `window.confirm()` or `alert()` for user-facing feedback. Inline confirmation patterns only.
- **Don't** apply Inter's Display scale (800 weight, clamp 4–6rem) to anything other than the brand logotype. One use. That's what makes it land.
