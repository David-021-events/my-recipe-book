# Code Review — prep/cook time feature + UI fixes

**Date**: 2026-05-06
**Reviewer**: Governance Agent
**Branch / commits reviewed**: `main` (9532ac7, 7765369, 5d82e54, c066078)

---

## Files Reviewed

| File | Lines | Change |
|------|-------|--------|
| `lib/extract.ts` | 172 | Added `prep_time`/`cook_time` to extraction prompt and Zod schema |
| `app/admin/new/page.tsx` | 457 | Added `prepTime`/`cookTime` state, inputs, and save body fields |
| `app/page.tsx` | 48 | Switched to `supabaseAdmin` + `force-dynamic` |
| `components/RecipeDetail.tsx` | 197 | Strip leading step numbers at render |
| `app/admin/edit/[id]/EditRecipeClient.tsx` | 79 | `router.refresh()` before push |
| `app/admin/page.tsx` | 39 | `force-dynamic` export |

---

## Automated Checks

| Check | Result |
|-------|--------|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run test` | PASS — 27 tests (was 23 before fixes) |
| `npm run audit:standards` | Not configured |

---

## Findings

### Issue 1 — FIXED: Stale JSDoc in `app/page.tsx` (misleading security comment)

**Severity**: Medium

The JSDoc comment stated *"Uses the public Supabase client so RLS enforces published-only access"* but the code used `supabaseAdmin`, which bypasses RLS entirely. The filter `eq('status', 'published')` is the actual guard here, not RLS. A stale comment of this kind can mislead future maintainers into believing a security boundary exists that does not.

**Fix applied**: Updated comment to accurately state that the admin client is used and that the `.eq('status', 'published')` filter is the enforcement mechanism.

**File**: `/workspaces/my-recipe-book/app/page.tsx` lines 6–9

---

### Issue 2 — FIXED: `ExtractionInput` type not exported (`lib/extract.ts`)

**Severity**: Low

`ExtractionInput` is the parameter type of the public `extractRecipe` function. Without exporting it, callers that want to type their inputs must re-declare the discriminated union, creating duplication and drift risk. Standards require all exported function signatures to have accessible types.

**Fix applied**: Added `export` and a JSDoc comment to the `ExtractionInput` type.

**File**: `/workspaces/my-recipe-book/lib/extract.ts` line 69

---

### Issue 3 — FIXED: No tests for `prep_time`/`cook_time` in `RecipeInputSchema`

**Severity**: Low (standards: 80%+ unit test coverage; new fields had zero test coverage)

The `RecipeInputSchema` was updated to include `prep_time` and `cook_time` but `lib/schemas.test.ts` had no assertions for these fields. The happy path (valid positive integers and `null`) and the sad path (zero, negative) were both unverified.

**Fix applied**: Added 4 test cases to `lib/schemas.test.ts`:
- Accepts valid `prep_time` / `cook_time` values
- Accepts `null` for both fields
- Rejects non-positive `prep_time`
- Rejects non-positive `cook_time`

Test count: 23 → 27 (all passing).

**File**: `/workspaces/my-recipe-book/lib/schemas.test.ts`

---

## Items Reviewed and Found Clean

| Area | Finding |
|------|---------|
| `any` types | None across all 6 files |
| Hardcoded secrets | None (ANTHROPIC_API_KEY reference is a user-facing error string, not a secret) |
| `console.log` | None |
| File length | All files under 500 lines (`app/admin/new/page.tsx` at 457 is largest — watch this one) |
| JSDoc on exports | All exported functions and types have JSDoc (after fix to `ExtractionInput`) |
| TypeScript strict compliance | Clean — `unknown` used for external data in `parseInstructions`, Zod validates API boundaries |
| Naming conventions | Consistent: snake_case DB columns, camelCase state vars, PascalCase components |
| Security | No secrets, admin client usage is server-side only in all cases |
| Zod validation at boundaries | `RecipeInputSchema` (API route), `RecipeExtractedSchema` (Claude response) — both correct |
| Step number stripping | `step.replace(/^\d+[\.\)]\s*/, '')` in `RecipeDetail.tsx` — correct, regex handles `1.` and `1)` formats |
| `router.refresh()` before `router.push()` | Correct pattern to invalidate Next.js router cache before navigation |

---

## Summary

**Issues found**: 3
**Issues fixed in this review**: 3
**Commits for fixes**: See git log after this review session

**Status**: PASS_WITH_WARNINGS
- All automated checks pass
- Three minor standards violations fixed
- `app/admin/new/page.tsx` at 457 lines is approaching the 500-line limit — consider splitting the editable preview section into a `RecipePreviewForm` component at the next opportunity
