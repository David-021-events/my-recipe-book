# Mobile UX Fixes — Admin List, Substitution Tooltip, Photo Upload

## Review Summary

**Reviewed**: 2026-05-17 | **Reviewers**: VP Product, VP Engineering, VP Design

### Changes Applied

| # | Change |
|---|--------|
| C1 | Fix 2: Document that `e.stopPropagation()` is required on button `onClick` to prevent tooltip closing immediately |
| 1 | Fix 2: `useEffect` must include `removeEventListener` cleanup to prevent memory leak on unmount |
| 2 | Fix 2: Add `aria-expanded={openSubIdx === i}` to toggle button for screen reader disclosure pattern |
| 3 | Fix 1: `overflow-hidden` stays on desktop wrapper only — remove it from the shared outer container |
| 4 | Fix 2: Button needs reset classes (`appearance-none bg-transparent border-0 p-0 cursor-pointer`) to strip browser defaults |
| 5 | Fix 2: Add `min-w-[44px] min-h-[44px] flex items-center justify-center` to ⚠ button for WCAG 2.5.5 touch target |
| 6 | Fix 1: Clarify that `View` link in mobile row is conditional on `status === 'published'`, same as table |
| 7 | Fix 3: Only revoke URLs for files being removed — not all previews — to avoid broken-image flash |
| 8 | Fix 2: Add `role="tooltip"` to popup div and wire `aria-describedby` from button to tooltip `id` |
| 9 | Fix 1: Add `divide-y divide-neutral-200` to mobile list wrapper to match table's row separators |
| 10 | Fix 3: Change button label from "choose more" to "tap to add more" |
| 11 | Fix 3: Specify full className for styled button (no placeholder `...`) |
| 12 | Fix 3: Note that the native `<input>` file list does not reflect the merged JS state — the styled button label is the sole indicator of selection count; this is intentional |
| 13 | Fix 1: Note explicitly that "Created" date is intentionally omitted from mobile view |
| 14 | Fix 2: Add `Escape` key handler to `useEffect` so keyboard users can dismiss the open tooltip |
| 15 | Fix 2: Note `bottom-full` positioning risk near page top — accept as acceptable edge case for this personal app |
| 16 | Verification: Add "remove 1 of 2 photos, then add more" as an explicit test scenario |

---

## Context

Three mobile usability issues reported:

1. **Admin recipe list** — View/Edit/Delete actions are hidden on portrait phone. The 4-column table overflows ~375px; `overflow-hidden` clips the actions column.
2. **Substitution tooltip** — ⚠ icon does nothing on touch. The popover uses CSS `group-hover:opacity-100` which never fires on touch devices.
3. **Photo upload tab** — three problems:
   - The native `<input type="file">` renders as unstyled browser text/button — not clearly tappable on mobile
   - "Extract Recipe" button *is* already disabled in code (`disabled={selectedFiles.length === 0}`) but visually unclear — needs `disabled:cursor-not-allowed`
   - `accept="image/jpeg,image/png"` prevents iOS from offering multi-select from the photo library; no way to add camera shots one at a time

---

## Fix 1 — Admin Recipe List (`app/admin/AdminRecipeList.tsx`)

**Approach: Dual layout**

- **Mobile (`sm:hidden`)**: Stacked flex rows — title + status badge left, action links right.
- **Desktop (`hidden sm:block`)**: Existing table unchanged, wrapped in a `<div class="hidden sm:block overflow-hidden rounded-lg border border-neutral-200">`.

**Important**: Remove `overflow-hidden` from the shared outer container — it must only apply to the desktop table wrapper. The mobile list does not need it and it would clip future positioned children.

The "Created" date column is intentionally omitted from the mobile view — it is low-value on small screens and including it would crowd the action links.

### Mobile list wrapper
```jsx
<div className="bg-white rounded-lg border border-neutral-200 divide-y divide-neutral-200 sm:hidden">
  {recipes.map((recipe) => (
    <div key={recipe.id} className="px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-sans text-sm font-medium text-neutral-900 truncate">{recipe.title}</p>
        {/* Same status badge markup as table */}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {recipe.status === 'published' && (
          <a href={`/recipes/${recipe.slug}`} className="font-sans text-sm text-neutral-500 hover:text-neutral-700">
            View
          </a>
        )}
        <a href={`/admin/edit/${recipe.id}`} className="font-sans text-sm font-medium text-brand-500 hover:text-brand-600">
          Edit
        </a>
        <button onClick={() => handleDelete(recipe.id, recipe.title)} className="font-sans text-sm text-red-600 hover:text-red-700 underline">
          Delete
        </button>
      </div>
    </div>
  ))}
</div>
```

Note: `View` is conditional on `status === 'published'`, matching the existing table behavior.

### Desktop table wrapper
```jsx
<div className="hidden sm:block overflow-hidden rounded-lg border border-neutral-200">
  <table className="w-full bg-white">
    {/* existing thead/tbody unchanged */}
  </table>
</div>
```

Remove the outer `<div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">` that currently wraps just the table.

---

## Fix 2 — Substitution Tooltip (`components/RecipeDetail.tsx`)

`RecipeDetail` is already `'use client'` with `useState`.

**Change**: Replace CSS hover with a click/tap toggle.

### State
```tsx
const [openSubIdx, setOpenSubIdx] = useState<number | null>(null)
```
Add alongside other state declarations near the top of the component.

### Outside-click + Escape dismiss effect
```tsx
useEffect(() => {
  if (openSubIdx === null) return
  function handleClose(e: MouseEvent | KeyboardEvent) {
    if (e instanceof KeyboardEvent && e.key !== 'Escape') return
    setOpenSubIdx(null)
  }
  document.addEventListener('click', handleClose)
  document.addEventListener('keydown', handleClose)
  return () => {
    document.removeEventListener('click', handleClose)
    document.removeEventListener('keydown', handleClose)
  }
}, [openSubIdx])
```
The cleanup (`removeEventListener`) is essential — without it, listeners accumulate each time the tooltip opens.

### Tooltip JSX (replaces the existing `.relative.group` div)
```tsx
{ingredient.hard_to_find && (() => {
  const tooltipId = `sub-tooltip-${i}`
  return (
    <div className="relative inline-flex ml-2 shrink-0">
      <button
        type="button"
        aria-label={
          ingredient.substitutions.length > 0
            ? `Hard to find — substitute: ${ingredient.substitutions.join(' or ')}`
            : 'Hard to find — no suitable alternative'
        }
        aria-expanded={openSubIdx === i}
        aria-describedby={openSubIdx === i ? tooltipId : undefined}
        className="appearance-none bg-transparent border-0 p-0 cursor-pointer text-warning-500 text-base min-w-[44px] min-h-[44px] flex items-center justify-center"
        onClick={(e) => {
          e.stopPropagation()   // ← required: prevents document click handler from closing immediately
          setOpenSubIdx((prev) => (prev === i ? null : i))
        }}
      >
        ⚠
      </button>
      {openSubIdx === i && (
        <div
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-48 bg-neutral-800 text-white text-xs rounded px-2 py-1.5 z-10 whitespace-normal text-center"
        >
          {ingredient.substitutions.length > 0
            ? ingredient.substitutions.join(' or ')
            : 'No Suitable Alternative'}
        </div>
      )}
    </div>
  )
})()}
```

**Critical**: `e.stopPropagation()` in the button `onClick` is non-negotiable. Without it the document `click` handler fires on the same bubble and closes the tooltip the instant it opens.

**Note on tooltip position**: `bottom-full` positions the popup above the icon, which may clip near the very top of the ingredient list. This is an acceptable edge case for a personal app.

**Removed** from original: `group` class on parent div, `opacity-0`, `group-hover:opacity-100`, `transition-opacity`, `pointer-events-none`, `cursor-help`.

---

## Fix 3 — Photo Upload Tab (`app/admin/new/page.tsx`)

### 3a. Styled file picker button
Hide the native input with `sr-only`. Add a styled button that triggers it programmatically. The native input `fileList` does not reflect the merged JS state — the button label is the only selection indicator, which is intentional.

```jsx
<button
  type="button"
  onClick={() => fileRef.current?.click()}
  className="w-full border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 font-sans font-medium text-sm px-4 py-2.5 rounded-md transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-brand-500"
>
  {selectedFiles.length === 0
    ? 'Choose Photos'
    : `${selectedFiles.length} photo${selectedFiles.length > 1 ? 's' : ''} selected — tap to add more`}
</button>
<input
  ref={fileRef}
  type="file"
  accept="image/*"
  multiple
  className="sr-only"
  onChange={...}
/>
```

### 3b. Extract button disabled state
Add `disabled:cursor-not-allowed` to the existing button className. The `disabled` attribute is already present and `disabled:opacity-50` is already applied.

### 3c. Multi-photo support — accept type
Change `accept="image/jpeg,image/png"` → `accept="image/*"`. The specific MIME types can prevent iOS from offering multi-select in the photo library picker and may suppress the camera option on some devices.

### 3d. Merge behavior on re-open
Change `onChange` to merge newly picked files with existing ones, capped at 3. Only revoke object URLs for files that are actually being discarded (the overflow beyond 3), not all existing previews:

```tsx
onChange={() => {
  const newFiles = Array.from(fileRef.current?.files ?? [])
  const merged = [...selectedFiles, ...newFiles].slice(0, 3)
  // Only revoke URLs for files that didn't make the cut
  const kept = new Set(merged)
  selectedFiles.forEach((f, idx) => {
    if (!kept.has(f)) URL.revokeObjectURL(imagePreviews[idx])
  })
  setSelectedFiles(merged)
  // Generate new URLs only for newly added files
  const existingCount = selectedFiles.filter(f => kept.has(f)).length
  const newPreviews = [
    ...imagePreviews.filter((_, idx) => kept.has(selectedFiles[idx])),
    ...newFiles.slice(0, 3 - existingCount).map(f => URL.createObjectURL(f)),
  ]
  setImagePreviews(newPreviews)
}}
```

Update helper text: `"Select up to 3 photos. Tap 'Choose Photos' again to add more from your library or camera."`

---

## Files Changed

| File | Change |
|------|--------|
| `app/admin/AdminRecipeList.tsx` | Add mobile stacked list with dividers; desktop table wrapped in `hidden sm:block overflow-hidden` div; `overflow-hidden` removed from shared outer container |
| `components/RecipeDetail.tsx` | Click-toggle tooltip with `stopPropagation`, `aria-expanded`, `role="tooltip"`, `aria-describedby`, 44px touch target, Escape key + outside-click dismiss with cleanup |
| `app/admin/new/page.tsx` | Styled `<button>` picker, `sr-only` input, `image/*` accept, merge-only URL revocation, `disabled:cursor-not-allowed` |

---

## Verification

1. `npm run typecheck` + `npm run lint` — clean
2. DevTools → iPhone SE (375px portrait):
   - `/admin` — View (published only)/Edit/Delete all visible; row dividers present
   - `/recipes/[slug]` — tap ⚠ → substitution popup appears; tap again → closes; tap elsewhere → closes; press Escape → closes
   - `/admin/new` (photo tab):
     - "Choose Photos" button clearly styled and tappable
     - "Extract Recipe" button is faded + no-cursor before selection; activates after
     - Select 1 photo, tap button again, add 1 more — 2 photos shown, no broken-image flash
     - Select 2 photos, tap button again, add 2 more — capped at 3, no flash
     - **Select 2 photos, remove 1, tap button again, add 1 more** — verify merge handles partial removal correctly
3. DevTools → 768px+ desktop:
   - `/admin` — table view renders correctly with `overflow-hidden` border-radius intact
   - `/recipes/[slug]` — click ⚠ works; hover no longer triggers (acceptable)
