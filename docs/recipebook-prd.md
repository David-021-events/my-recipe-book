# PRD — Personal Recipe Book (MVP)
> **For use with Claude Code in terminal**
> **Note:** This PRD covers the full MVP. As you build, treat each section of the build order as a separate Claude Code session with its own focused prompt.

---

## 1. What to Build

A private web app where one admin can input recipes (by text, photo, or URL) and have them automatically parsed into a structured format. Friends and family can browse and view recipes without logging in.

---

## 2. User Story

**As a** home cook, **I want to** paste, photograph, or link a recipe and have it automatically structured with a metric/imperial toggle, **so that** my family and friends can browse and use my recipes without me manually formatting anything.

---

## 3. What Happens (Step by Step)

### Admin: Adding a Recipe

1. Admin navigates to `/admin` and sees a password prompt. Enters `ADMIN_PASSWORD`. A session cookie is set and they land on the admin recipe list.
2. Admin clicks "Add Recipe" and arrives at `/admin/new`, which shows three tabs: **Paste Text**, **Upload Photo**, **Paste URL**.
3. Admin selects a tab and provides input (pastes text, uploads a jpg/png, or pastes a URL). Clicks "Extract Recipe."
4. The app calls `/api/extract`. The server sends the input to the Claude API, which returns structured JSON: title, servings, ingredients (with units, substitution flags), and instructions.
5. If extraction succeeds: the page shows an editable preview — title field, ingredients list, instructions textarea. Admin reviews, edits if needed, and clicks "Save." Recipe is saved to Supabase with `status: "draft"`.
6. If extraction fails (bad JSON twice in a row): the raw text is shown in an editable field. Admin can manually correct and save.
7. If URL fetch fails: an error message appears and the Paste Text tab opens with a note to paste the content manually.
8. Admin can change `status` to "published" on the edit page. Only published recipes appear publicly.

### Friend: Browsing Recipes

1. Friend opens the app root `/` and sees a grid of published recipe cards showing title and serving size.
2. Friend clicks a card and arrives at `/recipe/[id]` showing the recipe title, a serving size, an **Imperial | Metric** toggle, the ingredient list, and the instructions block.
3. Ingredients flagged as hard-to-find show a ⚠ symbol. Hovering or tapping reveals up to 2 substitution suggestions.
4. Toggling between Imperial and Metric converts all measurements client-side. Count-based units (eggs, cloves) and non-convertible units (pinch) are unchanged.

---

## 4. Constraints

| Use | Avoid |
|-----|-------|
| Next.js (App Router) | No other frameworks |
| Supabase (Postgres + Storage) | No other database |
| Anthropic Claude API for extraction | No other AI providers |
| Vercel for hosting | No other hosting |
| Single admin password via env var + HMAC-signed cookie (`COOKIE_SECRET`) | No auth libraries (NextAuth etc.) |
| Client-side unit conversion (no DB changes) | No server round-trips for toggling units |
| Tailwind CSS for styling | No CSS frameworks other than Tailwind |

**Hard rules:**
- All `/api/extract` calls and write methods on `/api/recipes` must verify the admin cookie. GET on `/api/recipes` is public.
- The Claude extraction prompt must return a normalized unit from a fixed list: `tsp`, `tbsp`, `cup`, `oz`, `lb`, `ml`, `g`, `kg`, `clove`, `pinch`, `count`.
- JSON parse failures must retry the Claude call once before falling back to manual edit mode.
- `NEXTAUTH_SECRET` is not used — do not include it.
- The admin session cookie must be HMAC-signed using `COOKIE_SECRET`. Password comparison in `/lib/auth.ts` must use `crypto.timingSafeEqual` (not `===`) to prevent timing attacks.
- The `/admin` login route must enforce rate limiting: maximum 5 failed attempts per 15 minutes per IP. Return HTTP 429 when exceeded.

---

## 5. Done Means

- [ ] Admin can log in with `ADMIN_PASSWORD` and is denied without it.
- [ ] `/api/extract` and write methods on `/api/recipes` return 401 without a valid admin cookie.
- [ ] Pasting a recipe as freeform text extracts a title, ingredient list with units, and instructions.
- [ ] Uploading a cookbook photo extracts the same structured output.
- [ ] Pasting a recipe URL extracts the same structured output.
- [ ] All extracted units are from the normalized list (`tsp`, `tbsp`, `cup`, `oz`, `lb`, `ml`, `g`, `kg`, `clove`, `pinch`, `count`).
- [ ] Count-based ingredients (e.g. "2 eggs") use unit `count` and are unaffected by the metric toggle.
- [ ] Metric/Imperial toggle converts all applicable measurements correctly client-side.
- [ ] Hard-to-find ingredients show ⚠ with up to 2 substitutions on hover/tap.
- [ ] Recipes saved as `draft` do not appear on public pages.
- [ ] Recipes saved as `published` appear on the public recipe list and are viewable at their URL.
- [ ] If Claude returns unparseable JSON, the app retries once then shows a manual edit fallback.
- [ ] If a URL cannot be fetched, the user sees an error and the Paste Text tab opens.
- [ ] Admin can edit and delete any recipe.

---

## 6. Out of Scope

- Friend accounts or any login for non-admins
- Recipe categories, tags, or filtering
- Search
- Comments or ratings
- Meal planning
- Print-optimised view (browser default is sufficient)
- Image display on recipe cards or recipe pages (column exists in DB, UI not built)
- Any UI for the `image_url` field

---

## 7. Notes for Future Extension

- `image_url` (text, nullable) and `status` columns are already in the schema. Image upload UI and a publish toggle can be added without a schema change.
- Ingredient search ("show me recipes with chicken") will require either a separate `ingredients` table or a Postgres full-text index on the `ingredients` jsonb column. The current jsonb approach is intentional for v1 simplicity.
- If search is added later, add a `title` index and a jsonb index on `ingredients` at that point.
- Tags and categories are a one-column schema addition when needed.

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
ANTHROPIC_API_KEY=
ADMIN_PASSWORD=
COOKIE_SECRET=          # random 32+ byte secret for HMAC cookie signing
```

---

## Database Schema

### Table: `recipes`

| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| title | text | |
| raw_input | text | original input preserved |
| instructions | text | free text block |
| ingredients | jsonb | structured list (see below) |
| servings | integer | default: 4 |
| status | text | "draft" or "published" — default "draft" |
| image_url | text | nullable — reserved, no UI in v1 |
| created_at | timestamp | auto |

### Ingredients JSON structure

```json
[
  {
    "name": "plain flour",
    "quantity": 2,
    "unit": "cups",
    "hard_to_find": false,
    "substitutions": []
  },
  {
    "name": "eggs",
    "quantity": 3,
    "unit": "count",
    "hard_to_find": false,
    "substitutions": []
  },
  {
    "name": "tamarind paste",
    "quantity": 1,
    "unit": "tbsp",
    "hard_to_find": true,
    "substitutions": ["lime juice", "rice vinegar"]
  }
]
```

---

## Claude Extraction Prompt

```
You are a recipe parser. Extract the following from the input and return ONLY valid JSON — no explanation, no markdown.

Return this structure:
{
  "title": string,
  "servings": number,
  "ingredients": [
    {
      "name": string,
      "quantity": number | null,
      "unit": string | null,
      "hard_to_find": boolean,
      "substitutions": string[]
    }
  ],
  "instructions": string
}

Rules:
- Return ONLY JSON. No markdown, no code fences, no explanation.
- hard_to_find is true only for ingredients unlikely to be in a standard Western pantry.
- substitutions: max 2 common alternatives, only populate if hard_to_find is true.
- unit must be one of: tsp, tbsp, cup, oz, lb, ml, g, kg, clove, pinch, count.
- Use "count" for items measured by whole number (eggs, onions, garlic cloves).
- Map all unit variants to the list above (e.g. tablespoon / T / Tbs → tbsp).
- If quantity or unit cannot be determined, use null.
- Preserve instructions as a single unformatted text block.
```

---

## Unit Conversion Reference (client-side only)

| Imperial unit | Metric equivalent |
|---|---|
| tsp | × 5 = ml |
| tbsp | × 15 = ml |
| cup | × 240 = ml |
| oz | × 28 = g |
| lb | × 454 = g |
| fl oz | × 30 = ml |

Units `count`, `pinch`, `clove` — display unchanged in both modes.

---

## Build Order for Claude Code

Build in this sequence. Each step should be working before starting the next.

1. Scaffold Next.js project with Supabase client
2. Create the `recipes` table in Supabase using the schema above
3. Build admin password middleware — protect `/admin/*` routes and verify cookie on write API routes
4. Build `/api/recipes` — GET (public), POST, PUT, DELETE (admin only)
5. Build admin recipe editor — `/admin/new` and `/admin/edit/[id]`
6. Build `/api/extract` — Claude API call, JSON retry logic, fallback response
7. Connect extraction to the admin new recipe page
8. Build public recipe list `/` — published recipes only
9. Build public single recipe page `/recipe/[id]` with metric/imperial toggle
10. Deploy to Vercel
