# Code Review: Steps 5 & 6 — Admin UI + Extract API

**Date:** 2026-05-04
**Reviewer:** Governance Agent
**Files:** app/admin/layout.tsx, app/admin/page.tsx, app/admin/AdminRecipeList.tsx, app/admin/RecipeForm.tsx, app/admin/new/page.tsx, app/admin/edit/[id]/page.tsx, app/admin/edit/[id]/EditRecipeClient.tsx, app/api/admin/logout/route.ts, lib/extract.ts, app/api/extract/route.ts

---

## Checks Run

- `npm run typecheck` — PASS
- `npm run lint` — PASS
- Manual standards audit against `standards.md`

---

## Issues Found & Fixed

### CRITICAL

| # | File | Issue | Fix |
|---|------|-------|-----|
| 1 | `app/api/extract/route.ts` | `request.json()` result destructured without Zod validation — untyped system boundary (§1.1) | Added `ExtractRequestSchema` Zod parse; body typed as `unknown` |

### MAJOR

| # | File | Issue | Fix |
|---|------|-------|-----|
| 2 | `app/admin/RecipeForm.tsx` | All 6 `<label>` elements missing `htmlFor`; corresponding inputs missing `id` — accessibility violation | Added matching `htmlFor`/`id` pairs (`rf-title`, `rf-servings`, etc.) |

### MINOR

| # | File | Issue | Fix |
|---|------|-------|-----|
| 3 | `app/admin/RecipeForm.tsx` | Exported `RecipeFormData` interface missing JSDoc (§1.4) | Added JSDoc comment |

---

## Not Fixed (Project-Wide Gap)

- **No tests exist** for any source files — violates §2.1 (80%+ unit, 90%+ API routes). This is a project-wide gap outside the scope of these two steps; tracked as an outstanding obligation.

---

## Status: PASS_WITH_WARNINGS

All fixable issues corrected. Test coverage gap flagged.
