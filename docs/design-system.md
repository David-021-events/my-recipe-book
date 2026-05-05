# Design System — Personal Recipe Book

**Status**: v1.0 — Ready to implement
**Stack**: Next.js + Tailwind CSS

> Warm-editorial aesthetic. Parchment-and-rust palette signals handmade care without being folksy. Lora gives recipe titles gravity; Inter keeps the utility layer crisp and scannable. Single-column layout prioritises the phone-in-hand cook.

---

## References

| Site | What we borrow |
|---|---|
| **Epicurious** | Editorial serif confidence, red/rust accent authority |
| **Food52** | Warm cream-and-rust palette, community warmth |
| **NYT Cooking** | Clean structure, ingredient/instruction layout |
| **Bon Appétit** | Generous whitespace, magazine-to-screen translation |

---

## Typography

Two families only. Weights and italics handle all hierarchy.

```css
/* Add to app/globals.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap');
```

| Role | Token | Font | Size | Weight | Tailwind Classes |
|---|---|---|---|---|---|
| Recipe title | `h1` | Lora | 36px | 700 | `font-display text-4xl font-bold leading-tight` |
| Section heading (Ingredients, Instructions) | `h2` | Lora | 22px | 600 | `font-display text-[1.375rem] font-semibold leading-snug` |
| Ingredient group subhead ("For the sauce") | `h3` | Inter | 13px | 700 | `font-sans text-[0.8125rem] font-bold uppercase tracking-widest text-neutral-500` |
| Recipe card title | `h4` | Lora | 18px | 600 | `font-display text-lg font-semibold leading-snug` |
| Body / instructions | — | Inter | 16px | 400 | `font-sans text-base leading-relaxed` |
| Metadata / captions | — | Inter | 13px | 400 | `font-sans text-[0.8125rem] text-neutral-500` |
| Label / badge | — | Inter | 11px | 600 | `font-sans text-[0.6875rem] font-semibold uppercase tracking-wider` |

**Italic rule:** Lora italic (`italic font-display`) is used for ingredient notes and substitution text — signals "this is a note, not an instruction."

---

## Color Palette

```ts
// tailwind.config.ts — colors.extend
brand: {
  50:  '#FBF8F4',  // parchment — public page background
  100: '#F4EFE6',  // cream — card backgrounds, inputs
  200: '#E8DDD0',  // warm sand — borders, dividers
  300: '#CEB89F',  // warm tan — disabled, placeholder text
  500: '#B85C38',  // rust — primary accent, links, buttons
  600: '#9A4A2C',  // deep rust — button hover, focus rings
  700: '#7D3A22',  // brick — pressed state
},
warning: {
  50:  '#FFF9EC',  // warning row background
  500: '#D97706',  // ⚠ icon and label (amber)
},
```

| Token | Hex | Usage |
|---|---|---|
| `brand-50` | `#FBF8F4` | Public page background |
| `brand-100` | `#F4EFE6` | Card bg, input fields |
| `brand-200` | `#E8DDD0` | Borders, `<hr>` dividers |
| `brand-500` | `#B85C38` | Primary accent — links, buttons, active tab |
| `brand-600` | `#9A4A2C` | Hover state |
| `neutral-50` | `#FAFAFA` | Admin page background |
| `neutral-200` | `#E5E5E5` | Admin borders, table rules |
| `neutral-500` | `#737373` | Muted text, metadata |
| `neutral-700` | `#3D3D3D` | Body copy |
| `neutral-900` | `#1A1A1A` | Headlines, ingredient names, admin nav |
| `warning-50` | `#FFF9EC` | Hard-to-find ingredient row tint |
| `warning-500` | `#D97706` | ⚠ icon colour |

**Colour logic:**
- Public pages → `brand-50` background, `brand-500` rust accent — warm, editorial
- Admin pages → `neutral-50` background, `neutral-900` nav — clearly distinct, functional

---

## Spacing Conventions

Tailwind default 4px scale — no custom spacing. Usage conventions:

| Purpose | Tailwind | px |
|---|---|---|
| Tight inner padding | `p-3` | 12 |
| Standard inner padding | `p-4` | 16 |
| Card padding | `p-6` | 24 |
| Section vertical rhythm | `py-10` / `py-12` | 40–48 |
| Recipe detail max-width | `max-w-3xl mx-auto` | 768px |
| Recipe grid max-width | `max-w-6xl mx-auto` | 1152px |
| Card grid gap | `gap-6` | 24 |
| Ingredient row padding | `py-2.5` | 10 top+bottom |
| Between recipe sections | `space-y-8` | 32 |

---

## Tailwind Config

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Lora', 'Georgia', '"Times New Roman"', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#FBF8F4',
          100: '#F4EFE6',
          200: '#E8DDD0',
          300: '#CEB89F',
          500: '#B85C38',
          600: '#9A4A2C',
          700: '#7D3A22',
        },
        warning: {
          50:  '#FFF9EC',
          500: '#D97706',
        },
      },
    },
  },
  plugins: [],
}

export default config
```

---

## Components

### Recipe Grid Card

```
bg-white rounded-lg shadow-sm overflow-hidden
hover:shadow-md transition-shadow duration-200
```

- Photo: `aspect-[3/2] w-full object-cover` (top of card)
- Title: `font-display text-lg font-semibold leading-snug text-neutral-900 line-clamp-2`
- Servings: `font-sans text-[0.8125rem] text-neutral-500 mt-1`
- No description text on card — photo + title only

---

### Recipe Detail Page Layout

Single-column `max-w-3xl mx-auto px-4`. No sidebar — mobile-first for mid-cook use.

**Title block:**
```
<h1 class="font-display text-4xl font-bold leading-tight text-neutral-900">
```

**Metadata bar** (below title, `flex items-center gap-3 mt-3 text-[0.8125rem] text-neutral-500`):
```
4 servings · 20 min prep · 45 min cook   [Imperial | Metric]
```

**Section divider:**
```html
<hr class="border-brand-200 my-8">
```

---

### Imperial / Metric Toggle

Two-segment pill. Place inline in the metadata bar.

```html
<div class="inline-flex rounded-full border border-brand-200 bg-brand-100 p-0.5">
  <button class="px-4 py-1.5 text-sm rounded-full bg-white shadow-sm font-semibold text-neutral-900">
    Imperial
  </button>
  <button class="px-4 py-1.5 text-sm rounded-full font-normal text-neutral-500">
    Metric
  </button>
</div>
```

Min total height 44px for touch targets.

---

### Ingredient List Rows

```html
<!-- Standard row -->
<div class="flex items-baseline justify-between py-2.5 border-b border-brand-200">
  <span class="font-sans font-semibold text-neutral-900 w-16 shrink-0">2 cups</span>
  <span class="font-sans text-neutral-700 flex-1 px-3">plain flour</span>
</div>

<!-- Hard-to-find row -->
<div class="flex items-baseline justify-between py-2.5 border-b border-brand-200 bg-warning-50 px-2 -mx-2 rounded">
  <span class="font-sans font-semibold text-neutral-900 w-16 shrink-0">1 tbsp</span>
  <div class="flex-1 px-3">
    <span class="font-sans text-neutral-700">tamarind paste</span>
    <span class="block font-display italic text-sm text-neutral-500 mt-0.5">
      sub: lime juice or rice vinegar
    </span>
  </div>
  <span class="text-warning-500 text-base ml-2" title="Hard to find">⚠</span>
</div>

<!-- Group subheading -->
<p class="font-sans text-[0.8125rem] font-bold uppercase tracking-widest text-neutral-500 pt-5 pb-1">
  For the sauce
</p>
```

---

### Buttons

```html
<!-- Primary -->
<button class="bg-brand-500 hover:bg-brand-600 text-white font-sans font-semibold text-sm px-5 py-2.5 rounded-md transition-colors min-h-[44px]">
  Save Recipe
</button>

<!-- Secondary / Ghost -->
<button class="border border-brand-200 text-neutral-700 hover:bg-brand-100 font-sans font-semibold text-sm px-5 py-2.5 rounded-md transition-colors min-h-[44px]">
  Cancel
</button>

<!-- Destructive — link style only, never filled -->
<button class="text-red-600 hover:text-red-700 font-sans text-sm underline">
  Delete recipe
</button>
```

---

### Tabs (Add/Edit Recipe)

```html
<div class="flex border-b border-brand-200">
  <!-- Active tab -->
  <button class="px-4 py-2.5 font-sans text-sm font-medium text-brand-500 border-b-2 border-brand-500 -mb-px">
    Paste Text
  </button>
  <!-- Inactive tab -->
  <button class="px-4 py-2.5 font-sans text-sm font-medium text-neutral-500 hover:text-neutral-700 border-b-2 border-transparent -mb-px">
    Upload Photo
  </button>
  <button class="px-4 py-2.5 font-sans text-sm font-medium text-neutral-500 hover:text-neutral-700 border-b-2 border-transparent -mb-px">
    Paste URL
  </button>
</div>
<div class="pt-6">
  <!-- tab content -->
</div>
```

---

### Navigation (Public)

```html
<nav class="bg-white border-b border-brand-200 h-15">
  <div class="max-w-6xl mx-auto px-4 flex items-center justify-between h-full">
    <a class="font-display italic font-semibold text-xl text-neutral-900">My Recipe Book</a>
    <!-- optional links -->
  </div>
</nav>
```

- Height: 60px desktop, 56px mobile
- Not sticky — unnecessary complexity for this app size

---

### Admin Pages

```html
<!-- Admin nav — clearly signals "you're in admin mode" -->
<nav class="bg-neutral-900 text-white h-14">
  <div class="max-w-6xl mx-auto px-4 flex items-center gap-6 h-full">
    <span class="font-sans text-sm font-semibold text-white">Admin</span>
    <a class="font-sans text-sm text-neutral-400 hover:text-white">Recipes</a>
    <a class="font-sans text-sm text-neutral-400 hover:text-white ml-auto">Log out</a>
  </div>
</nav>

<!-- Admin page background: bg-neutral-50 (not parchment) -->

<!-- Form card -->
<div class="bg-white rounded-lg border border-neutral-200 p-6">
  <!-- form content -->
</div>

<!-- Input field -->
<input class="w-full border border-neutral-200 rounded-md px-3 py-2.5
              focus:ring-2 focus:ring-brand-500 focus:border-brand-500
              font-sans text-sm text-neutral-900 placeholder:text-neutral-400">
```

---

## Quick Reference

| Token | Value |
|---|---|
| Display font | Lora (Google Fonts) |
| Body/UI font | Inter (Google Fonts) |
| Public page bg | `#FBF8F4` |
| Card bg | `#FFFFFF` |
| Primary accent | `#B85C38` |
| Accent hover | `#9A4A2C` |
| Border / divider | `#E8DDD0` |
| Body text | `#3D3D3D` |
| Heading text | `#1A1A1A` |
| Muted text | `#737373` |
| Warning bg | `#FFF9EC` |
| Warning icon | `#D97706` |
| Admin bg | `#FAFAFA` |
| Admin nav bg | `#1A1A1A` |
| Border radius — cards | `rounded-lg` (8px) |
| Border radius — buttons | `rounded-md` (6px) |
| Border radius — toggle | `rounded-full` |
| Recipe detail width | `max-w-3xl` (768px) |
| Grid width | `max-w-6xl` (1152px) |
