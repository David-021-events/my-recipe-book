# Plan: Structured Instructions + Hard-to-Find Tooltip

## Context
Two UX improvements to the public recipe detail page:
1. Instructions are currently one undivided text blob. User wants a mise en place prep section followed by numbered cooking steps.
2. The ⚠ hard-to-find warning icon has no interactive feedback. User wants a tooltip that shows substitution alternatives (or "No Suitable Alternative" if none exist).

---

## Feature 1: Structured Instructions

### Strategy
Change the Claude extraction prompt to return instructions as a structured object `{ mise_en_place: string[], steps: string[] }`. Serialize this to JSON before storing in the existing `text` column in Supabase (no schema migration needed). Parse it at render time in `RecipeDetail`, with a fallback to plain-text display for any existing recipes stored as strings.

### Files to change

**`lib/types.ts`**
Add a new exported interface and update `Recipe.instructions`:
```ts
export interface StructuredInstructions {
  mise_en_place: string[]
  steps: string[]
}
// In Recipe interface:
instructions: string | StructuredInstructions | null
```

**`lib/schemas.ts`**
Add `StructuredInstructionsSchema` and update `RecipeExtractedSchema`:
```ts
export const StructuredInstructionsSchema = z.object({
  mise_en_place: z.array(z.string()),
  steps: z.array(z.string()),
})
// RecipeExtractedSchema.instructions: StructuredInstructionsSchema
// RecipeInputSchema.instructions: z.union([z.string(), StructuredInstructionsSchema]).nullable().optional()
```

**`lib/extract.ts`**
Update the Claude prompt to request structured instructions:
```
"instructions": {
  "mise_en_place": [string],   // prep steps: measuring, chopping, pre-heating
  "steps": [string]            // numbered cooking steps, in order
}
```
Also update `RecipeExtractedSchema` inline in this file to use `StructuredInstructionsSchema`.
Serialize to JSON string before returning: `instructions: JSON.stringify(extracted.instructions)`.

**`components/RecipeDetail.tsx`**
Parse instructions at render time. If `JSON.parse` succeeds and the object has `steps`, render structured. Otherwise render as plain text (backward compat for old recipes):
```tsx
// Mise en place section (if array is non-empty)
<h3>Before you start</h3>
<ul>  {miseEnPlace.map(step => <li>step</li>)}  </ul>
// Steps section
<h3>Instructions</h3>
<ol>  {steps.map(step => <li>step</li>)}  </ol>
// Fallback
<p className="whitespace-pre-wrap">{instructions as string}</p>
```

**`app/admin/RecipeForm.tsx`**
Replace the single instructions textarea with two sections:
- "Mise en Place" — textarea, one step per line, placeholder: "Preheat oven to 180°C\nDice the onion…"
- "Cooking Steps" — textarea, one step per line, placeholder: "Heat oil in a pan…\nAdd onion and cook 5 min…"

On load: if instructions is a JSON object, populate each textarea from the respective array. If it's a plain string, put it in Cooking Steps and leave Mise en Place empty.
On save: split each textarea by `\n`, filter blank lines → `JSON.stringify({ mise_en_place, steps })`.

---

## Feature 2: Hard-to-Find Tooltip

### Strategy
Replace the plain `<span title="Hard to find">⚠</span>` with a Tailwind `group-hover` tooltip. No JavaScript state needed — pure CSS. Show substitutions in the tooltip; show "No Suitable Alternative" if the array is empty.

Also: since substitutions for **hard-to-find** ingredients are now surfaced via the tooltip, remove the inline `sub: ...` text for those ingredients only. Non-hard-to-find ingredients with substitutions keep the inline display.

### File to change

**`components/RecipeDetail.tsx`** (lines 100–110)

Current:
```tsx
{ingredient.substitutions.length > 0 && (
  <span ...>sub: {ingredient.substitutions.join(' or ')}</span>
)}
{ingredient.hard_to_find && (
  <span ... title="Hard to find">⚠</span>
)}
```

Replace with:
```tsx
{/* Inline subs only for non-hard-to-find ingredients */}
{!ingredient.hard_to_find && ingredient.substitutions.length > 0 && (
  <span className="block font-display italic text-sm text-neutral-500 mt-0.5">
    sub: {ingredient.substitutions.join(' or ')}
  </span>
)}
{/* ⚠ icon with tooltip for hard-to-find */}
{ingredient.hard_to_find && (
  <div className="relative group inline-flex ml-2 shrink-0">
    <span className="text-warning-500 text-base cursor-help">⚠</span>
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-48
                    bg-neutral-800 text-white text-xs rounded px-2 py-1.5
                    opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10
                    whitespace-normal text-center">
      {ingredient.substitutions.length > 0
        ? ingredient.substitutions.join(' or ')
        : 'No Suitable Alternative'}
    </div>
  </div>
)}
```

---

## Verification
1. `npm run typecheck` passes
2. `npm run test` passes (23/23 — schema tests will need updating for new instructions shape)
3. Extract a new recipe → instructions render as "Before you start" + numbered steps
4. Old string-format recipe (if any exist in DB) still renders as plain text block
5. Hover over ⚠ on a hard-to-find ingredient → tooltip shows substitution(s) or "No Suitable Alternative"
6. Non-hard-to-find ingredient with substitutions → inline `sub:` text still shows, no ⚠
