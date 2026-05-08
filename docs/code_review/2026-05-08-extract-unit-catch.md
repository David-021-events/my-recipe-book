# Code Review — extract.ts unit field `.catch(null)` addition

**Date**: 2026-05-08
**Reviewer**: Governance Agent
**Branch / commits reviewed**: `main` (fe0ab85)

---

## Files Reviewed

| File | Lines | Changed |
|------|-------|---------|
| `lib/extract.ts` | 177 | Yes — primary change |
| `components/RecipeDetail.tsx` | 219 | Yes — also changed in same commit |

---

## Change Summary

A single line was added to the Zod schema for the `unit` field in `lib/extract.ts`:

```ts
// Before
unit: z
  .enum(['tsp', 'tbsp', 'cup', 'oz', 'lb', 'ml', 'g', 'kg', 'clove', 'pinch', 'count'])
  .nullable(),

// After
unit: z
  .enum(['tsp', 'tbsp', 'cup', 'oz', 'lb', 'ml', 'g', 'kg', 'clove', 'pinch', 'count'])
  .nullable()
  .catch(null),
```

The `RecipeDetail.tsx` change in the same commit adds a `formatTime(minutes: number): string` helper and updates prep/cook time display from raw minutes to human-readable strings (e.g. `"1 hr 30 min"`).

---

## Checks Run

| Check | Result |
|-------|--------|
| `npm run typecheck` | PASS — no errors |
| `npm run lint` | PASS — 4 pre-existing `<img>` warnings, 0 errors, 0 new issues |
| `npm run test` | PASS — 27/27 tests passing (3 test files) |

---

## Standards Compliance

### lib/extract.ts

| Standard | Status | Notes |
|----------|--------|-------|
| TypeScript strict mode | PASS | No `any` types; unknown used at parse boundary |
| No `console.log` | PASS | None present |
| No hardcoded secrets | PASS | API client uses env implicitly via SDK |
| File length < 500 lines | PASS | 177 lines |
| JSDoc on exported functions/types | PASS | `extractRecipe`, `ExtractionResult`, `ExtractionInput`, `RecipeExtracted` all documented |
| Runtime validation at boundaries | PASS | Zod schema validates all Claude output |

### .catch(null) correctness

The `.catch(null)` fallback is semantically correct and defensive. Without it, an unrecognised unit value returned by Claude (e.g. `"litre"`, `"dozen"`) would cause the entire ingredient parse to fail, returning `null` from `parseAndValidate` and triggering a retry. With `.catch(null)`, an invalid unit coerces to `null` gracefully — the ingredient is still captured with `unit: null`. This aligns with the existing `quantity` field behaviour (also `.nullable()`) and the prompt instruction: "If quantity or unit cannot be determined, use null."

### components/RecipeDetail.tsx

| Standard | Status | Notes |
|----------|--------|-------|
| TypeScript strict mode | PASS | All types explicit; no `any` |
| No `console.log` | PASS | None present |
| File length < 500 lines | PASS | 219 lines |
| JSDoc on exported symbols | PASS | `RecipeDetail` default export has JSDoc; `formatTime` and `parseInstructions` are private (unexported) — JSDoc not required by standards |
| Naming conventions | PASS | camelCase functions, PascalCase component |

---

## Issues Found

None. No issues requiring fixes were identified.

---

## Pre-existing Lint Warnings (not introduced by this change)

Four `@next/next/no-img-element` warnings exist across the codebase:

- `app/admin/RecipeForm.tsx:154`
- `app/admin/new/page.tsx:365`
- `components/RecipeCard.tsx:21`
- `components/RecipeDetail.tsx:67`

These are warnings, not errors, and were present before this change. They are tracked as pre-existing technical debt and are out of scope for this review.

---

## Verdict

**PASS** — The change is minimal, correct, and fully compliant with all engineering standards. No fixes required.
