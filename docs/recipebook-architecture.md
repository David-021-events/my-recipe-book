# Recipe Book — Architecture Document

---

## Deployment: Vercel ✓

Right choice. Your load is trivial — 50 recipes, ~12 casual users. Vercel's serverless model fits perfectly with zero ops overhead. One constraint to design around below.

---

## The One Critical Constraint: Vercel Serverless Limits

Vercel's serverless functions have two limits that directly affect photo upload:

| Limit | Value | Risk |
|---|---|---|
| Request body size | 4.5MB | Phone photos are often 3–6MB |
| Function timeout | 10s (free) / 60s (pro) | Claude vision calls can take 10–15s |

Both are solvable without leaving Vercel. They must be designed for upfront.

---

## Photo Upload: Core Decision

Since the photo is discarded after extraction, there is zero storage infrastructure needed. No Supabase Storage. No S3. The image never touches a database.

```
Browser → compress image → base64 encode → POST /api/extract → Claude API → JSON → discard
```

The only file that persists is the extracted recipe JSON in Postgres. This removes an entire infrastructure layer from the original PRD.

---

## Solving the File Size Problem

Raw phone photos will exceed Vercel's 4.5MB request limit. Solve this client-side before the image leaves the browser, using the browser's built-in Canvas API — no extra library needed.

```
FUNCTION compressImage(file):
  draw image onto canvas at max 1600px wide
  export as JPEG at 80% quality
  → typically reduces a 5MB photo to ~400KB
  return base64 string
```

At ~400KB (530KB base64 encoded), you are well inside Vercel's limit. Sharp enough for Claude to read recipe text reliably.

---

## Solving the Timeout Problem

Set the `/api/extract` route to use Vercel's extended timeout:

```javascript
// top of /api/extract/route.ts
export const maxDuration = 60 // requires Vercel Pro; free tier allows 10s
```

Start on the free tier. Upgrade to Pro ($20/mo) only if you hit timeouts in practice.

---

## Extraction Module (Isolated)

The extraction logic lives in one file. This is the most likely thing to swap later — different model, different prompt, different provider. The API route calls this function and knows nothing about Claude directly.

```
/lib/extract.ts

FUNCTION extractRecipe(input):

  IF input.type === "text":
    message = { role: "user", content: input.text }

  IF input.type === "image":
    message = { role: "user", content: [
      { type: "image", base64: input.data, mediaType: "image/jpeg" },
      { type: "text", text: EXTRACTION_PROMPT }
    ]}

  IF input.type === "url":
    fetchedText = await fetch(input.url) → extract body text (strip HTML tags)
    IF fetch fails: return { error: "url_fetch_failed" }
    message = { role: "user", content: fetchedText }

  response = claudeAPI.call(message)

  TRY:  return JSON.parse(response)
  CATCH: retry once
  CATCH again: return { fallback: true, rawText: response }
```

---

## Simplified Stack vs Original PRD

| Component | Original PRD | This Doc |
|---|---|---|
| Database | Supabase Postgres | ✓ Same |
| File Storage | Supabase Storage | **Removed entirely** |
| Image handling | Upload to storage, save URL | **Compress → extract → discard** |
| URL import | `/api/fetch-url` route | ✓ Same — `/api/fetch-url` fetches page HTML, passes text to `/api/extract` |
| Admin auth | Signed cookie | ✓ Same |
| Hosting | Vercel | ✓ Same |

---

## Database Schema

```sql
CREATE TABLE recipes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  slug         text UNIQUE NOT NULL,  -- URL-safe identifier, e.g. "chocolate-chip-cookies"
  raw_input    text,
  instructions text,
  ingredients  jsonb,
  servings     integer DEFAULT 4,
  status       text DEFAULT 'draft',
  image_url    text,
  prep_time    integer,               -- minutes
  cook_time    integer,               -- minutes
  created_at   timestamp DEFAULT now(),
  updated_at   timestamp DEFAULT now()
);
```

Slugs are auto-generated from the recipe title on create and regenerated on title update. Collision handling appends a numeric suffix (`-2`, `-3`, etc.).

### Ingredients JSON Structure

```json
[
  {
    "name": "plain flour",
    "quantity": 2,
    "unit": "cup",
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

## File Structure

```
/app
  /page.tsx                         — public recipe list
  /recipes/[slug]/page.tsx          — public recipe detail (slug-based URL)
  /admin/layout.tsx                 — admin shell with nav bar
  /admin/page.tsx                   — admin recipe list
  /admin/new/page.tsx               — add recipe (text / photo / URL tabs)
  /admin/edit/[id]/page.tsx         — edit recipe
  /admin/login/page.tsx             — admin login form

/app/api
  /extract/route.ts                 — Claude extraction endpoint
  /recipes/route.ts                 — GET (public list), POST (admin create)
  /recipes/[id]/route.ts            — GET (public single), PUT / DELETE (admin)
  /recipes/[id]/image/route.ts      — POST / DELETE recipe image (admin)
  /admin/login/route.ts             — set admin session cookie
  /admin/logout/route.ts            — clear admin session cookie

/lib
  /extract.ts                       — isolated Claude logic (swap to change AI provider)
  /slugify.ts                       — slug generation utility
  /schemas.ts                       — Zod validation schemas for API boundaries
  /types.ts                         — shared TypeScript types (Recipe, Ingredient, etc.)
  /compress.ts                      — client-side image compression (Canvas API)
  /convert.ts                       — client-side unit conversion
  /storage.ts                       — Supabase Storage helpers for recipe images
  /supabase.ts                      — db client (public + service-role)
  /auth.ts                          — HMAC cookie sign / verify; admin session helpers
  /rate-limit.ts                    — in-memory IP rate limiter for login route
```

---

## Unit Conversion Reference (client-side only)

| Imperial | Metric |
|---|---|
| tsp | × 5 = ml |
| tbsp | × 15 = ml |
| cup | × 240 = ml |
| oz | × 28 = g |
| lb | × 454 = g |

Units `count`, `pinch`, `clove` — display unchanged in both modes.

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
- substitutions: max 2 common alternatives, only if hard_to_find is true.
- unit must be one of: tsp, tbsp, cup, oz, lb, ml, g, kg, clove, pinch, count.
- Use "count" for items measured by whole number (eggs, onions, garlic cloves).
- Map all unit variants to the list above (e.g. tablespoon / T / Tbs → tbsp).
- If quantity or unit cannot be determined, use null.
- Preserve instructions as a single unformatted text block.
```

---

## What Is Intentionally Left Simple

- **No search** — 50 recipes is a scroll problem, not a search problem
- **No categories** — same reason
- **Unit conversion** — pure client-side function, no API call

---

## Auth & Security

### Admin Session Cookie

The session cookie must be **HMAC-signed** to prevent forgery. A plaintext cookie (e.g. `admin=true`) can be forged by any user. Use a secret-keyed HMAC so the server can verify the cookie value has not been tampered with.

Implementation in `/lib/auth.ts`:
- On successful login: compute `HMAC-SHA256(cookieValue, COOKIE_SECRET)`, store `value.signature` as the cookie.
- On each protected request: recompute the HMAC and compare using **`crypto.timingSafeEqual`** (not `===`) to prevent timing attacks.

### Rate Limiting on `/admin` Login Route

Add basic IP-based rate limiting: **5 failed attempts per 15 minutes per IP**. Return HTTP 429 after the threshold is exceeded. A simple in-memory Map is sufficient for a single-instance deployment (no Redis needed at this scale).

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
ANTHROPIC_API_KEY=
ADMIN_PASSWORD=
COOKIE_SECRET=          # random 32+ byte secret for HMAC cookie signing
```

---

## Future Extension Notes

The one thing worth revisiting before extending this app: if search or filtering is ever needed, the `ingredients` jsonb column becomes limiting. Moving to a separate `ingredients` table unlocks full search. The current structure is intentional for v1 simplicity — don't change it until 50 recipes genuinely feels painful to browse.
