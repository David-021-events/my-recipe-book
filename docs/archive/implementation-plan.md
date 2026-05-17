# Implementation Plan — Personal Recipe Book

**Status**: Ready to execute
**Build order**: Follow steps 1–10 sequentially. Each step must be working before starting the next.

---

## Summary

| Step | Name | Key Files | Key Concern | Done Signal |
|---|---|---|---|---|
| 1 | Scaffold | `package.json`, `tsconfig.json`, `tailwind.config.ts`, `globals.css` | TS strict mode, font imports | `npm run dev` renders a blank page |
| 2 | Database | Supabase SQL migration | Schema exactly as specced | Table visible in Supabase dashboard |
| 3 | Auth middleware | `lib/auth.ts`, `middleware.ts` | HMAC cookie, `timingSafeEqual`, rate limiting | `/admin` redirects without cookie; 429 after 5 bad logins |
| 4 | Recipes API | `app/api/recipes/route.ts`, `app/api/recipes/[id]/route.ts` | Admin cookie on writes, public GET | GET 200 public; POST/PUT/DELETE 401 without cookie |
| 5 | Admin UI | `app/admin/*`, `lib/supabase.ts` | Draft/publish toggle, edit/delete | Admin can CRUD recipes end-to-end |
| 6 | Extract API | `lib/extract.ts`, `app/api/extract/route.ts`, `app/api/fetch-url/route.ts` | Retry once, fallback, image compress | All 3 input types return structured JSON |
| 7 | Connect extraction | `app/admin/new/page.tsx` | Text/Photo/URL tabs wired to `/api/extract` | Extracted recipe populates editable preview |
| 8 | Public list | `app/page.tsx` | Published only, design system grid | Cards visible; drafts absent |
| 9 | Public detail | `app/recipe/[id]/page.tsx`, `lib/convert.ts` | Client-side unit conversion, substitution hints | Toggle converts units; ⚠ shows substitutions |
| 10 | Deploy | `vercel.json`, `.env` setup | `maxDuration=60`, env vars | App live on Vercel URL |

---

## Environment Variables

Required across the build. Never commit values.

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=        # from Supabase project settings
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # from Supabase project settings
SUPABASE_SERVICE_KEY=            # service role key (server-side only)
ANTHROPIC_API_KEY=               # from console.anthropic.com
ADMIN_PASSWORD=                  # chosen by user
COOKIE_SECRET=                   # random 32+ byte hex string
```

Generate `COOKIE_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

## npm Dependencies

```bash
# Core
npx create-next-app@latest . --typescript --tailwind --app --src-dir=no --import-alias="@/*"

# Supabase
npm install @supabase/supabase-js

# Anthropic
npm install @anthropic-ai/sdk

# Runtime validation (system boundaries)
npm install zod

# No other dependencies. No auth libraries, no image libraries, no CSS frameworks beyond Tailwind.
```

---

## Step 1 — Scaffold Next.js Project

### Files to create/modify

**`tailwind.config.ts`** — extend with design system tokens:
- `fontFamily.display`: `['Lora', 'Georgia', '"Times New Roman"', 'serif']`
- `fontFamily.sans`: `['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']`
- `colors.brand`: `{ 50, 100, 200, 300, 500, 600, 700 }` — see design-system.md
- `colors.warning`: `{ 50, 500 }`

**`app/globals.css`** — add Google Fonts import:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**`app/layout.tsx`** — root layout:
- `<html lang="en">` with `font-sans` on `<body>`
- `bg-brand-50 text-neutral-700` base classes
- No global navigation here — public nav is in `app/page.tsx`, admin nav in admin layout

**`tsconfig.json`** — verify `"strict": true` is set (create-next-app sets this by default)

**`next.config.ts`** — no custom config needed at this step

### Acceptance criteria
- `npm run dev` runs without errors
- `npm run typecheck` passes
- `npm run lint` passes
- Lora and Inter load in browser

---

## Step 2 — Database Setup (Supabase)

### SQL to run in Supabase SQL editor

```sql
CREATE TABLE recipes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  raw_input    text,
  instructions text,
  ingredients  jsonb,
  servings     integer DEFAULT 4,
  status       text DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  image_url    text,
  created_at   timestamp with time zone DEFAULT now()
);

-- Public read, no public write
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published recipes"
  ON recipes FOR SELECT
  USING (status = 'published');

-- Service key bypasses RLS (used server-side for admin operations)
```

### Notes
- RLS allows public SELECT on published rows only
- All admin writes use `SUPABASE_SERVICE_KEY` (bypasses RLS) — never expose this key client-side
- `image_url` column exists but is never written to in v1

### Acceptance criteria
- Table visible in Supabase Table Editor
- RLS policies active
- Can INSERT a row via Supabase dashboard and query it back

---

## Step 3 — Auth Middleware

### Files to create

**`lib/auth.ts`** — cookie helpers:

```
Functions to implement:
- hashPassword(password: string): string
    crypto.createHmac('sha256', COOKIE_SECRET).update(password).digest('hex')

- signCookie(value: string): string
    returns `${value}.${hmac(value)}`

- verifyCookie(cookie: string): boolean
    splits on last '.', recomputes HMAC, compares with crypto.timingSafeEqual
    returns false if malformed or signature mismatch

- getAdminSession(request: Request): boolean
    reads 'admin_session' cookie, calls verifyCookie
```

**`lib/rate-limit.ts`** — in-memory rate limiter:

```
Implementation:
- Map<string, { count: number; resetAt: number }>
- checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number }
    - 5 attempts per 15 minutes per IP
    - Clears expired entries on each check
    - Returns allowed: false + retryAfter seconds when exceeded
```

**`app/admin/login/page.tsx`** — login form:
- Single password input + submit button
- POST to `/api/admin/login`
- Shows error on wrong password or 429

**`app/api/admin/login/route.ts`** — login endpoint:
- Reads IP from `x-forwarded-for` header (Vercel sets this)
- Calls `checkRateLimit(ip)` — returns 429 with `Retry-After` header if exceeded
- Compares submitted password to `ADMIN_PASSWORD` using `crypto.timingSafeEqual`
- On success: sets `admin_session` cookie (HttpOnly, Secure, SameSite=Strict, 7-day maxAge) with `signCookie('admin')`
- On failure: increments rate limit counter, returns 401

**`middleware.ts`** — Next.js middleware:
- Matches `/admin/*` routes (excluding `/admin/login`)
- Calls `verifyCookie` on the `admin_session` cookie
- Redirects to `/admin/login` if invalid or absent
- Does NOT protect API routes here — API routes verify the cookie themselves

### Security requirements
- `crypto.timingSafeEqual` on all cookie and password comparisons — no `===`
- Cookie: `HttpOnly; Secure; SameSite=Strict`
- Rate limit: 5 attempts / 15 min / IP → HTTP 429

### Acceptance criteria
- `GET /admin` without cookie → redirects to `/admin/login`
- Wrong password 5× → 429 response
- Correct password → cookie set → `/admin` accessible
- Deleting cookie → redirected back to login

---

## Step 4 — Recipes API

### Files to create

**`lib/supabase.ts`** — two clients:

```ts
// Public client (anon key, respects RLS)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Service client (service key, bypasses RLS — server-side only)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
```

**`lib/types.ts`** — shared TypeScript types:

```ts
export type Unit = 'tsp' | 'tbsp' | 'cup' | 'oz' | 'lb' | 'ml' | 'g' | 'kg' | 'clove' | 'pinch' | 'count'
export type RecipeStatus = 'draft' | 'published'

export interface Ingredient {
  name: string
  quantity: number | null
  unit: Unit | null
  hard_to_find: boolean
  substitutions: string[]
}

export interface Recipe {
  id: string
  title: string
  raw_input: string | null
  instructions: string | null
  ingredients: Ingredient[] | null
  servings: number
  status: RecipeStatus
  image_url: string | null
  created_at: string
}
```

**`app/api/recipes/route.ts`** — collection endpoint:
- `GET` (public): `supabase.from('recipes').select('*').eq('status', 'published').order('created_at', { ascending: false })` — uses public client
- `POST` (admin): verify cookie → `supabaseAdmin.from('recipes').insert(body)` — validate body with Zod before insert
- Both return `application/json`

**`app/api/recipes/[id]/route.ts`** — single recipe endpoint:
- `GET` (public): fetch by id, return 404 if not found or status !== 'published'
- `PUT` (admin): verify cookie → validate body → upsert
- `DELETE` (admin): verify cookie → delete by id

### Zod schema for recipe input validation

```ts
const IngredientSchema = z.object({
  name: z.string(),
  quantity: z.number().nullable(),
  unit: z.enum(['tsp','tbsp','cup','oz','lb','ml','g','kg','clove','pinch','count']).nullable(),
  hard_to_find: z.boolean(),
  substitutions: z.array(z.string()).max(2),
})

const RecipeInputSchema = z.object({
  title: z.string().min(1),
  servings: z.number().int().positive().default(4),
  instructions: z.string().nullable(),
  ingredients: z.array(IngredientSchema).nullable(),
  raw_input: z.string().nullable(),
  status: z.enum(['draft', 'published']).default('draft'),
})
```

### Acceptance criteria
- `GET /api/recipes` returns published recipes only (no auth needed)
- `POST /api/recipes` without cookie → 401
- `POST /api/recipes` with valid cookie + body → recipe created in DB
- `PUT /api/recipes/[id]` without cookie → 401
- `DELETE /api/recipes/[id]` without cookie → 401

---

## Step 5 — Admin UI

### Files to create

**`app/admin/layout.tsx`** — admin layout wrapper:
- Dark admin nav bar (`bg-neutral-900 text-white`)
- "Admin" label + "Recipes" link + "Log out" link (POST to `/api/admin/logout`)
- Background: `bg-neutral-50`

**`app/api/admin/logout/route.ts`**:
- Clears `admin_session` cookie
- Redirects to `/admin/login`

**`app/admin/page.tsx`** — recipe list:
- Fetches all recipes (draft + published) using `supabaseAdmin` via server component
- Table: title | status badge | created date | Edit | Delete actions
- "Add Recipe" button → `/admin/new`
- Delete: POST to `/api/recipes/[id]` with DELETE method, confirm with browser `confirm()` dialog

**`app/admin/new/page.tsx`** — new recipe page (shell only at this step):
- Placeholder UI — wired to extract in Step 7
- At this step: just a form with title, servings, ingredients (textarea for JSON), instructions, status select, Save button
- Save POSTs to `/api/recipes`

**`app/admin/edit/[id]/page.tsx`** — edit recipe:
- Server component: fetch recipe by id using `supabaseAdmin`
- Pre-populated form (same fields as new)
- Save PUTs to `/api/recipes/[id]`
- Status toggle: draft ↔ published (this is how recipes go live)
- Delete button at bottom (link style, red)

### Design system usage
- Form cards: `bg-white rounded-lg border border-neutral-200 p-6`
- Input fields: `border border-neutral-200 rounded-md px-3 py-2.5 focus:ring-2 focus:ring-brand-500`
- Primary button: `bg-brand-500 hover:bg-brand-600 text-white ...`
- Destructive button: `text-red-600 hover:text-red-700 text-sm underline`
- Status badge: `draft` → gray pill, `published` → green pill

### Acceptance criteria
- Admin can view all recipes (draft + published)
- Admin can create a recipe manually (no extraction yet)
- Admin can edit title, servings, ingredients, instructions, status
- Admin can delete a recipe
- Published/draft status toggles correctly

---

## Step 6 — Extract API

### Files to create

**`lib/extract.ts`** — isolated Claude extraction logic:

```
Types:
  ExtractionInput =
    | { type: 'text'; text: string }
    | { type: 'image'; data: string; mediaType: 'image/jpeg' | 'image/png' }
    | { type: 'url'; url: string }

  ExtractionResult =
    | { success: true; recipe: RecipeExtracted }
    | { success: false; fallback: true; rawText: string }
    | { success: false; error: 'url_fetch_failed' }

Function extractRecipe(input: ExtractionInput): Promise<ExtractionResult>

Logic:
  1. If type === 'url':
     - fetch(url) with 10s timeout
     - If fetch fails: return { success: false, error: 'url_fetch_failed' }
     - Strip HTML tags from response body (regex or simple parser — no library)
     - Continue as type 'text' with the stripped content

  2. Build Claude message per input type (text vs image)
     - Text: { role: 'user', content: PROMPT + '\n\n' + text }
     - Image: { role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type, data } }, { type: 'text', text: PROMPT }] }

  3. Call Claude (claude-sonnet-4-6 or claude-haiku-4-5 — configurable via env)
     Model: 'claude-sonnet-4-6', max_tokens: 2048

  4. Attempt JSON.parse on response text
     On failure: retry the Claude call ONCE (same input)
     On second failure: return { success: false, fallback: true, rawText: responseText }

  5. On parse success: validate shape with Zod RecipeExtractedSchema
     Return { success: true, recipe: parsed }
```

**Extraction prompt** — exact text from PRD (copy verbatim, do not paraphrase):
```
You are a recipe parser. Extract the following from the input and return ONLY valid JSON...
[full prompt from PRD section "Claude Extraction Prompt"]
```

**`app/api/extract/route.ts`** — extraction endpoint:
- `export const maxDuration = 60` — required for Vercel (Claude vision can take 10–15s)
- Verify admin cookie → 401 if absent
- Accept JSON body: `{ type: 'text' | 'image' | 'url', content: string }`
  - For image: `content` is base64 string; derive `mediaType` from content prefix or request header
- Call `extractRecipe(input)`
- Return extraction result as JSON
- On `url_fetch_failed`: return `{ error: 'url_fetch_failed' }` with 422 status

**`app/api/fetch-url/route.ts`** — (this is handled inside `lib/extract.ts` for URL type; this route is NOT needed as a separate endpoint — URL fetching happens server-side within `/api/extract`)

### Acceptance criteria
- POST to `/api/extract` without cookie → 401
- Pasting recipe text → returns structured JSON with title, ingredients, instructions
- Uploading JPEG → same structured JSON
- Pasting a recipe URL → same structured JSON
- All units in response are from the normalised list
- Claude returning bad JSON → retried once → if still bad, returns `{ fallback: true, rawText: '...' }`
- Unreachable URL → returns `{ error: 'url_fetch_failed' }`

---

## Step 7 — Connect Extraction to Admin New Page

### Files to modify

**`app/admin/new/page.tsx`** — replace placeholder with full extraction UI:

**Three-tab interface** (client component `'use client'`):
- Tab bar: Paste Text | Upload Photo | Paste URL
- Tab styles from design-system.md (rust underline active state)

**Paste Text tab:**
- `<textarea>` for recipe text
- "Extract Recipe" button → POST to `/api/extract`

**Upload Photo tab:**
- `<input type="file" accept="image/jpeg,image/png">`
- On file select: run client-side compression before extraction
- Compression function (in this file or `lib/compress.ts`):
  ```
  compressImage(file: File): Promise<string>  // returns base64 jpeg
    - Draw onto canvas at max 1600px wide
    - Export as JPEG quality 0.8
    - Target ~400KB (well under Vercel's 4.5MB limit)
  ```
- "Extract Recipe" button → POST compressed base64 to `/api/extract`

**Paste URL tab:**
- `<input type="url">` for recipe URL
- "Extract Recipe" button → POST to `/api/extract`
- On `url_fetch_failed` error: show message + switch active tab to "Paste Text"

**Extraction result flow:**
- Loading state while extracting (disable button, show spinner)
- On success: show editable preview:
  - Title `<input>` (pre-filled)
  - Servings `<input type="number">` (pre-filled)
  - Ingredients: editable list (add/remove rows) — each row: quantity | unit select | name
  - Instructions `<textarea>` (pre-filled)
  - Status select: draft / published
  - "Save Recipe" button → POST to `/api/recipes`
- On `fallback: true`: show raw text in editable `<textarea>` with note "Extraction failed — edit and save manually"
- On `url_fetch_failed`: toast/inline error + auto-switch to Paste Text tab

### Acceptance criteria
- All three tabs functional
- Photo compressed client-side before upload (verify: network tab shows < 600KB payload)
- Extracted recipe pre-fills the editable form
- Admin can edit any field before saving
- Fallback mode shows raw text for manual entry
- URL fetch failure switches to Paste Text tab with note

---

## Step 8 — Public Recipe List

### Files to create/modify

**`app/page.tsx`** — public recipe grid (server component):
- Fetch published recipes: `supabase.from('recipes').select('id, title, servings').eq('status', 'published').order('created_at', { ascending: false })`
- Uses public anon client (RLS enforces published-only)
- If no recipes: empty state — "No recipes yet. Check back soon."

**Layout:**
- Public nav: `bg-white border-b border-brand-200`, logo in Lora italic
- Page: `bg-brand-50 min-h-screen`
- Grid: `max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`

**Recipe card** (can be `components/RecipeCard.tsx`):
- `bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden`
- No photo in v1 — card is text-only: title + servings
- Title: `font-display text-lg font-semibold leading-snug text-neutral-900 line-clamp-2`
- Servings: `font-sans text-[0.8125rem] text-neutral-500 mt-1`
- Card padding: `p-6`
- Entire card is a `<Link href={/recipe/${id}}>` — no nested interactive elements

### Acceptance criteria
- Published recipes appear as cards
- Draft recipes do not appear
- Each card links to `/recipe/[id]`
- Empty state shown when no published recipes

---

## Step 9 — Public Recipe Detail Page

### Files to create

**`lib/convert.ts`** — client-side unit conversion:

```ts
type UnitSystem = 'imperial' | 'metric'

// Conversion map — imperial → metric
const TO_METRIC: Partial<Record<Unit, { factor: number; unit: Unit }>> = {
  tsp:  { factor: 5,   unit: 'ml' },
  tbsp: { factor: 15,  unit: 'ml' },
  cup:  { factor: 240, unit: 'ml' },
  oz:   { factor: 28,  unit: 'g'  },
  lb:   { factor: 454, unit: 'g'  },
}
// count, pinch, clove, ml, g, kg — unchanged in both systems

export function convertIngredient(
  ingredient: Ingredient,
  system: UnitSystem
): Ingredient
// Returns new ingredient object with converted quantity+unit
// If unit not in conversion map, returns ingredient unchanged
// Rounds to sensible precision (1 decimal for ml, integer for g)
```

**`app/recipe/[id]/page.tsx`** — recipe detail (server component shell + client island):

Server component:
- Fetch recipe by id: `supabase.from('recipes').select('*').eq('id', id).eq('status', 'published').single()`
- Return 404 (`notFound()`) if not found or draft

Client component `RecipeDetail` (rendered inside server page):
- Holds `unit` state: `'imperial' | 'metric'` (default `'imperial'`)
- Converts all ingredients client-side using `lib/convert.ts` when unit changes — no server round-trip

**Layout:**
- `max-w-3xl mx-auto px-4 py-10`
- Title: `font-display text-4xl font-bold leading-tight text-neutral-900`
- Metadata bar: servings + unit toggle inline, `flex items-center gap-4 mt-3`
- Unit toggle: pill design from design-system.md
- `<hr class="border-brand-200 my-8">` between sections

**Ingredients section:**
- `<h2 class="font-display text-[1.375rem] font-semibold">Ingredients</h2>`
- Each ingredient row: `flex items-baseline justify-between py-2.5 border-b border-brand-200`
- Hard-to-find rows: `bg-warning-50 px-2 -mx-2 rounded` with `⚠` icon
- Substitutions: Lora italic below ingredient name, shown always (not just on hover — simpler, mobile-friendly)
- Quantity displayed with converted value

**Instructions section:**
- `<h2>` heading
- Instructions as a `<p>` or pre-formatted text block: `font-sans text-base leading-[1.8] text-neutral-700 whitespace-pre-wrap`

### Acceptance criteria
- Draft recipes return 404
- Imperial/Metric toggle converts tsp/tbsp/cup/oz/lb correctly
- count, pinch, clove units unchanged by toggle
- Hard-to-find ingredients show ⚠ with substitutions visible
- Page is readable on mobile (375px width)

---

## Step 10 — Deploy to Vercel

### Pre-deploy checklist
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes (no `console.log`, no `any`)
- [ ] All env vars documented and ready to enter in Vercel dashboard
- [ ] `export const maxDuration = 60` present in `app/api/extract/route.ts`

### Vercel setup

1. Push repo to GitHub
2. Import project in Vercel dashboard
3. Set environment variables (all 6 from the env vars section above)
4. Deploy

**No `vercel.json` needed** — `maxDuration` is set inline in the route file, which is the Next.js App Router way.

**Vercel plan note**: Free tier has 10s function timeout. `/api/extract` with Claude vision may exceed this. Upgrade to Pro ($20/mo) if timeouts occur in practice (see architecture doc).

### Post-deploy smoke test
- [ ] `GET /` shows recipe grid (or empty state)
- [ ] `GET /admin` redirects to `/admin/login`
- [ ] Admin login with correct password works
- [ ] Add a recipe via text extraction, publish it
- [ ] Published recipe appears at `/`
- [ ] Recipe detail page loads, unit toggle works

---

## Cross-Cutting Concerns

### TypeScript strict mode
- No `any` — use `unknown` for Claude API response before parsing
- All exported functions explicitly typed
- Zod used at system boundaries: `/api/extract` response, `/api/recipes` request body

### Cookie security
- HMAC-SHA256 signed with `COOKIE_SECRET`
- All comparisons via `crypto.timingSafeEqual` — never `===`
- Cookie flags: `HttpOnly; Secure; SameSite=Strict`

### Rate limiting
- In-memory `Map` in `lib/rate-limit.ts`
- 5 failed login attempts per 15 minutes per IP
- IP from `x-forwarded-for` header (Vercel sets this)
- Returns HTTP 429 with `Retry-After` header

### Claude extraction retry
- Parse fail → retry once (same input, new API call)
- Second parse fail → return `{ fallback: true, rawText: string }`
- Never throw to the client — always return a structured response

### Client-side image compression
- Canvas API only — no library
- Max 1600px wide, JPEG 80% quality
- Target ~400KB (base64 ~530KB, well under Vercel's 4.5MB limit)
- Must happen before the fetch to `/api/extract`

### Unit conversion
- Pure client-side in `lib/convert.ts`
- Never a server round-trip
- `count`, `pinch`, `clove` — returned unchanged in both modes
- Metric units (ml, g, kg) — returned unchanged in both modes

### No `console.log` in committed code
- Use during development, remove before commit

---

## File Structure (complete)

```
/app
  layout.tsx                     — root layout, font classes, bg-brand-50
  page.tsx                       — public recipe grid (server component)
  globals.css                    — font import, tailwind directives
  /recipe/[id]
    page.tsx                     — public recipe detail (server + client island)
  /admin
    layout.tsx                   — admin nav + bg-neutral-50
    page.tsx                     — admin recipe list
    /login
      page.tsx                   — login form
    /new
      page.tsx                   — add recipe (tabs + extraction + editable preview)
    /edit/[id]
      page.tsx                   — edit recipe form

/app/api
  /admin
    /login/route.ts              — POST: verify password, set cookie
    /logout/route.ts             — POST: clear cookie
  /extract/route.ts              — POST (admin): call lib/extract.ts
  /recipes/route.ts              — GET (public), POST (admin)
  /recipes/[id]/route.ts         — GET (public), PUT/DELETE (admin)

/lib
  auth.ts                        — signCookie, verifyCookie, getAdminSession
  rate-limit.ts                  — checkRateLimit (in-memory Map)
  extract.ts                     — extractRecipe (Claude API, retry logic)
  convert.ts                     — convertIngredient (client-side unit conversion)
  supabase.ts                    — supabase (public) + supabaseAdmin (service key)
  types.ts                       — Recipe, Ingredient, Unit, RecipeStatus types

/components
  RecipeCard.tsx                 — public grid card
  RecipeDetail.tsx               — client island for detail page (unit toggle state)

middleware.ts                    — protect /admin/* routes
```
