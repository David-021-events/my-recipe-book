# Code Review: Mobile UX Fixes

**Date:** 2026-05-17
**Reviewer:** Governance agent
**Branch:** main
**Status:** PASS (2 issues fixed inline)

---

## Files Reviewed

| File | Lines | Result |
|------|-------|--------|
| `app/admin/AdminRecipeList.tsx` | 149 | Fixed |
| `components/RecipeDetail.tsx` | 285 | Pass |
| `app/admin/new/page.tsx` | 500 | Fixed |
| `app/api/extract/route.ts` | 69 | Pass |
| `lib/extract.ts` | 177 | Pass |

---

## Automated Checks

| Check | Result |
|-------|--------|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| No `console.log` | Pass |
| No hardcoded secrets | Pass |
| No `any` types | Pass |
| All files ≤ 500 lines | Pass (after fix) |

---

## Issues Found and Fixed

### 1. `app/admin/new/page.tsx` — File exceeded 500-line limit (584 lines)

**Severity:** Standards violation (§1.3)

**Root cause:** The photo-picker feature added ~80 lines of state management and JSX inline, pushing the file to 584 lines.

**Fix:** Extracted the photo picker into `app/admin/new/PhotoPicker.tsx` (107 lines), a self-contained component that owns `selectedFiles`, `imagePreviews`, the `useRef` for the hidden input, and the `useEffect` cleanup. `NewRecipePage` now passes `extracting` and `onExtract` props down, and the photo tab renders `<PhotoPicker extracting={extracting} onExtract={handleExtractPhoto} />`. `page.tsx` is now exactly 500 lines.

**Side benefit:** `handleExtractPhoto` now receives `files: File[]` as a parameter rather than closing over component state, making it easier to test in isolation.

---

### 2. `app/admin/AdminRecipeList.tsx` — `StatusBadge` defined inside component body after early return

**Severity:** React anti-pattern / performance

**Root cause:** `StatusBadge` was defined as a function declaration inside `AdminRecipeList`, after the early-return guard. React identifies component types by reference. Because the function is re-declared on every render of the parent, React treats it as a new component type each render and unmounts/remounts all `StatusBadge` instances. This causes unnecessary DOM churn (six badge instances per recipe list render: three in mobile, three in desktop).

**Fix:** Hoisted `StatusBadge` to module level above `AdminRecipeList`. Added a JSDoc comment explaining why it is hoisted.

---

## Positive Findings

### `components/RecipeDetail.tsx` — Tooltip refactor (hover → click)

Excellent implementation. Key aspects verified:

- `useEffect` is properly conditional: event listeners are only added when `openSubIdx !== null`, and the cleanup function removes both `click` and `keydown` listeners — no listener leak on re-renders.
- `e.stopPropagation()` on the toggle button correctly prevents the document-level `click` handler from immediately closing the tooltip that was just opened.
- `aria-expanded`, `aria-describedby`, and `role="tooltip"` form a complete ARIA pattern. The `aria-label` on the button provides a text alternative for screen readers even when the tooltip is closed.
- `min-w-[44px] min-h-[44px]` on the trigger button meets the 44×44px touch target WCAG guideline.
- `appearance-none bg-transparent border-0` correctly resets button chrome without removing focus styles (focus is inherited from the browser default on `button`).

### `app/admin/new/page.tsx` — Multi-photo extraction

- `Promise.allSettled` is the correct choice: a single corrupt image does not abort the batch.
- The merge logic correctly preserves existing object URLs for already-selected files rather than regenerating them (avoids URL churn).
- The `disabled:cursor-not-allowed` addition is a small but useful UX improvement that was missing from the other extract buttons — acceptable inconsistency given admin-only context.
- `image/*` instead of `image/jpeg,image/png` is the right call for mobile: it surfaces the camera option on iOS/Android.

### `app/api/extract/route.ts` and `lib/extract.ts` — API contract

- The Zod discriminated union (`z.discriminatedUnion`) with `.max(3)` on the image array enforces the payload budget constraint at the API boundary before it reaches Claude — correct place to enforce it.
- The `as const` casts in `buildMessages` are necessary and correct: without them TypeScript widens `type` and `source.type` to `string`, which the Anthropic SDK rejects.
- `console.error` in the catch block is intentional server-side logging (not a `console.log` violation per standards).

---

## Notes for Follow-up (Non-blocking)

- `StatusBadge` takes `status: string` rather than `status: 'published' | 'draft'`. This is safe but could be tightened to the union type from `RecipeSummary['status']` if the status field is ever typed as a union in `lib/types.ts`.
- `new/page.tsx` is exactly 500 lines. The file will breach the limit on the next feature addition to the editable-preview section. Consider splitting `RecipeEditPreview` out of `page.tsx` proactively.
- No tests were added alongside these changes. Per §2.1, unit coverage target is 80%+. The `handleExtractPhoto` function (now with a `files` param) is a good candidate for a unit test.
