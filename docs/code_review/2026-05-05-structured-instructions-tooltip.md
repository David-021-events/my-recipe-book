# Code Review: Structured Instructions (Mise en Place + Numbered Steps) and Hard-to-Find Tooltip

**Date:** 2026-05-05
**Commit reviewed:** `6bdc2c4` — feat: structured instructions (mise en place + numbered steps) and hard-to-find tooltip
**Reviewer:** Governance agent
**Files reviewed:**
- `lib/types.ts`
- `lib/extract.ts`
- `components/RecipeDetail.tsx`
- `app/admin/RecipeForm.tsx`
- `app/admin/new/page.tsx`

---

## Checks Run

| Check | Result |
|-------|--------|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run test` (23 tests, 3 files) | PASS |

---

## Findings

### PASS — TypeScript Strict Compliance

All five files compile under `"strict": true`. No `any` types used anywhere; `unknown` is used where untyped data is parsed (e.g., `parseInstructions` in `RecipeDetail.tsx` uses `const parsed: unknown`). Zod is used at the extraction API boundary per standards.

### PASS — File Length

All files are within the 500-line limit:

| File | Lines |
|------|-------|
| `lib/types.ts` | 36 |
| `lib/extract.ts` | 145 (pre-fix) / 157 (post-fix) |
| `components/RecipeDetail.tsx` | 181 (pre-fix) / 196 (post-fix) |
| `app/admin/RecipeForm.tsx` | 270 |
| `app/admin/new/page.tsx` | 418 (pre-fix) / 421 (post-fix) |

### PASS — No console.log, No Secrets

No `console.log` statements found. No hardcoded secrets.

### FIXED — JSDoc Missing on Two Exported Types (`lib/extract.ts`)

`RecipeExtracted` and `ExtractionResult` were exported without JSDoc comments. Standards require JSDoc on all public/exported functions and types. Fixed by adding descriptive JSDoc to both.

### FIXED — Accessibility: Four Issues Across Two Components

#### `components/RecipeDetail.tsx`

1. **Warning tooltip icon** (`⚠`): A bare Unicode character used as an informational icon with no accessible label. Screen readers would announce "warning sign" or nothing useful. Fixed by adding `role="img"` and a dynamic `aria-label` that includes the substitution information or "no suitable alternative".

2. **Unit toggle buttons** (`Imperial` / `Metric`): Toggle buttons with visual-only active state (CSS class change). No programmatic state communicated to assistive technology. Fixed by adding `aria-pressed={unit === 'imperial' | 'metric'}` on each button and a `role="group"` wrapper with `aria-label="Unit system"`.

#### `app/admin/new/page.tsx`

3. **Tab bar buttons** (`Paste Text`, `Upload Photo`, `Paste URL`): Custom tab-like navigation implemented as plain `<button>` elements with no ARIA role semantics. Screen readers could not identify these as a tab panel control. Fixed by adding `role="tablist"` on the container, `role="tab"` and `aria-selected` on each button.

4. **File input** (photo upload): An `<input type="file">` with no associated `<label>` element and no `aria-label`. Screen readers would announce it as an unnamed file picker. Fixed by adding `aria-label="Recipe photo (JPEG or PNG)"`.

---

## Issues Fixed

- **Count:** 4 accessibility deficiencies, 2 JSDoc omissions — 6 issues total
- **Fix commit:** `f493a6a` — `fix(governance): add aria labels, aria-pressed, role=tab, and JSDoc on exported types`

---

## Verdict

**PASS_WITH_WARNINGS**

The feature commit (`6bdc2c4`) delivered correct, well-structured functionality: the `StructuredInstructions` type is properly defined, Zod validation at the extraction boundary is solid, and the admin form correctly serialises/deserialises the new `mise_en_place` + `steps` JSON shape. No `any` types, no console statements, no secrets, all tests pass.

Six governance issues were introduced (4 accessibility, 2 JSDoc) and have been corrected in the follow-up commit `f493a6a`. The codebase is now fully compliant.
