# Distribution Strategy for My Recipe Book

## Review Summary

**Reviewed**: 2026-05-17 | **Reviewers**: VP Product, VP Engineering, VP Design

### Changes Applied

| # | Change |
|---|--------|
| 1 | Added Branching Strategy section (was missing from doc) |
| 2 | Specified new `getAdminSession` return type and full list of files needing auth refactor |
| 3 | Clarified which Supabase client is used per write path and how RLS policies are structured |
| 4 | Added webhook idempotency requirement (Lemon Squeezy retries on failure) |
| 5 | Corrected rate-limit counter: track extractions in a separate log, not saved recipe count |
| 6 | Added first-login forced password change to mitigate plaintext password in welcome email |
| 7 | Decided pricing model: one-time fee (not subscription) — documented webhook event differences |
| 8 | Added welcome email spec: tone, required fields, spam-folder fallback instructions |
| 9 | Added backfill migration step for existing recipes that have no `user_id` |
| 10 | Specified webhook signature verification must use raw body buffer, not parsed JSON |
| 11 | Documented in-memory rate limiter as known serverless debt |
| 12 | Added account deletion / GDPR right-to-erasure to legal P0 requirements |
| 13 | Documented calendar-month reset edge case in UI copy guidance |
| 14 | Decided usage meter placement: account page header, not inline in recipe list |
| 15 | Added PWA icon size requirements (192×192 and 512×512) to PWA section |
| 16 | Added password reset UX spec: link placement on login page, reset page design |
| 17 | Added onboarding copy spec for empty state |
| 18 | Decided onboarding format: inline banner (not modal) |
| 19 | Added legal page placement: footer link on account page |
| 20 | Specified Vercel Pro plan required (Hobby plan caps functions at 10s, extract needs 60s) |

---

## Branching Strategy

Create a single long-lived feature branch for all this work:

```
git checkout -b feat/distribution
```

**Why one branch (not many):** The pieces are tightly coupled — multi-tenancy must land before search, auth, or the webhook can work correctly. Splitting into sub-branches would require constant rebasing between them. For a solo developer, one branch is simpler and easier to manage.

**Keep `main` live and deployed throughout.** The current single-user app stays up on Vercel (pointing at `main`) while you build on `feat/distribution`. When the new version is ready and tested, merge to main and it becomes the new production app.

**Commit sequence within the branch** (each commit should be internally consistent):
1. DB schema — `users` table, `user_id` on `recipes`, `extractions_log` table, RLS policies, backfill migration
2. Auth overhaul — multi-user login, session carries `user_id`
3. PWA manifest — independent, can land any time
4. Payment webhook + signup flow
5. P0 features — search, password reset, account page, empty state, legal pages

---

## Context

Non-technical users want this app. They expect an app-store or "save to home screen" experience. The creator wants to charge enough to cover Anthropic API + hosting costs, but must not handle credit cards directly (PCI/fraud risk), and wants minimal attack surface.

The previous options (open source template, MCP server, Docker) are all wrong for this audience — they require technical setup skills the users don't have.

---

## The Right Frame

This is a **small multi-tenant web app delivered as a PWA** (Progressive Web App). Key properties:

- Users open a URL in Safari/Chrome → tap "Add to Home Screen" → it lives on their home screen like a real app
- Payment is fully outsourced to Lemon Squeezy (they handle credit cards, PCI compliance, VAT, refunds — creator never touches card data)
- When someone pays, a webhook auto-creates their account and emails them a password — no manual work
- Each user sees only their own recipes (Supabase Row Level Security enforces this at the DB layer)
- Creator runs one Vercel deployment, one Supabase instance, collects revenue via bank transfer from Lemon Squeezy

**Vercel plan required: Pro.** The Hobby plan caps serverless function duration at 10 seconds. The extract endpoint uses `maxDuration = 60` for Claude vision calls — this requires Vercel Pro (~$20/month). Factor into pricing.

---

## Pricing Model Decision

**One-time fee, not a subscription.** A subscription requires handling `subscription_renewed` and `subscription_cancelled` webhook events, data retention policies on lapse, and communicating recurring charges to non-technical users. A one-time fee is simpler for everyone: user pays once, gets lifetime access.

**Price target: $15 one-time.** Covers: Vercel Pro ($20/mo ÷ expected users), Anthropic API ($1.50/user/month worst case at 30 extractions × $0.05), Lemon Squeezy fee ($1.25 on a $15 sale). At 10+ users the Vercel cost is amortised well.

**Lemon Squeezy webhook event to handle:** `order_created` only. No renewal or cancellation events needed.

---

## What Needs to Change

### 1. Make it a proper PWA (2–3 hours)

Add `/public/manifest.json` and `<link rel="manifest">` in the root layout. Required fields:
- `name`, `short_name`, `start_url`, `display: "standalone"`, `background_color`, `theme_color`
- Icons at **192×192** and **512×512** (PNG). These must be real branded icons — missing or placeholder icons look unfinished on the home screen. Create these assets before shipping.

### 2. DB schema changes (migrate in this order)

**New `users` table:**
```sql
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  must_change_password boolean NOT NULL DEFAULT true,
  monthly_limit integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**New `extractions_log` table** (for accurate rate limiting — see Rate Limiting section):
```sql
CREATE TABLE extractions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Modify `recipes` table:**
```sql
ALTER TABLE recipes ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;
```

**Backfill migration** — existing single-user recipes must get a `user_id` before the column can be made `NOT NULL`. Steps:
1. Insert the creator's account into `users` first
2. `UPDATE recipes SET user_id = '<creator-user-id>' WHERE user_id IS NULL`
3. `ALTER TABLE recipes ALTER COLUMN user_id SET NOT NULL`

**Enable RLS:**
```sql
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own recipes" ON recipes
  USING (user_id = current_setting('app.user_id', true)::uuid);

ALTER TABLE extractions_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own extractions" ON extractions_log
  USING (user_id = current_setting('app.user_id', true)::uuid);
```

**RLS client strategy:** The app uses two Supabase clients today. Their roles in the multi-tenant world:

| Client | RLS | Used for |
|--------|-----|---------|
| `supabaseAnon` (public key) | Enforced | All user-facing recipe reads (public recipe pages) |
| `supabaseAdmin` (service key) | Bypassed | Webhook account creation, admin operations only |

For all recipe reads/writes in authenticated user sessions, use `supabaseAnon` and set `app.user_id` via `SET LOCAL` before queries, OR use `supabaseAdmin` with explicit `WHERE user_id = $userId` on every query. **The plan chooses explicit `WHERE` clauses with `supabaseAdmin`** for simplicity, with the understanding that every query must include the filter — this is a code-review checklist item, not a DB guarantee.

### 3. Auth overhaul — new return type

`getAdminSession` in `lib/auth.ts` currently returns `boolean`. The new return type must be:

```typescript
type SessionResult = { valid: true; userId: string; mustChangePassword: boolean } | { valid: false }
```

**Every file that calls `getAdminSession` must be updated:**

| File | Change needed |
|------|--------------|
| `middleware.ts` | Extract `userId` from session; pass to request headers |
| `app/api/admin/login/route.ts` | Query `users` table; set `mustChangePassword` in cookie |
| `app/api/extract/route.ts` | Use `userId` from session for extraction log + recipe creation |
| `app/api/recipes/route.ts` | Filter all queries by `userId` |
| `app/api/recipes/[id]/route.ts` | Filter all queries by `userId` |
| `app/api/recipes/[id]/image/route.ts` | Filter by `userId` |

Multi-tenancy estimate is **3–4 days**, not 1–2, once the cascading auth changes are counted.

### 4. Automated signup via Lemon Squeezy webhook (4–5 hours)

- Creator sets up a one-time product in Lemon Squeezy
- Add `/api/webhook/lemon-squeezy/route.ts`
- Handle `order_created` event only
- **Idempotency:** Lemon Squeezy retries webhook delivery on failure. The handler must check whether the order has already been processed (store `lemon_squeezy_order_id` in the `users` table or a separate `webhook_events` table) and skip duplicate processing silently.
- **Signature verification:** Lemon Squeezy signs payloads with HMAC-SHA256. Verification **must use the raw request body buffer**, not `await request.json()`. Call `request.text()` first, verify the signature, then `JSON.parse` the result.
- On success: create user, generate random password, set `must_change_password = true`, send welcome email via Resend

**Welcome email spec:**
- **Tone:** Warm and simple. "Your Recipe Book is ready." Not technical.
- **Required fields:** App URL, temporary password, "Add to Home Screen" instructions (2 steps: open URL in Safari → tap share icon → Add to Home Screen), support email
- **Spam fallback note:** Include "Check your spam folder if you don't see this" in the confirmation page on Lemon Squeezy's checkout success screen (not in the email itself)
- **First login:** User is flagged `must_change_password = true`. On first successful login, redirect to a password change screen before showing the app. They cannot access recipes until they set a new password. This mitigates the plaintext-in-email risk.

---

## What This Looks Like for Users

1. Friend sees the app, asks how to get it
2. Creator shares a Lemon Squeezy checkout link
3. Friend pays with Apple Pay or card on Lemon Squeezy's hosted page (creator's server never involved)
4. Lemon Squeezy fires `order_created` webhook → app creates account → sends welcome email with temporary password and "Add to Home Screen" instructions
5. Friend opens the app URL in Safari, taps Add to Home Screen
6. Friend logs in with temporary password → immediately prompted to set a new personal password
7. App is on their home screen, recipe book is theirs

---

## Feature Gaps Before Launch

### Must-have before charging money (P0)

**1. PWA manifest + icons** — requires real 192×192 and 512×512 PNG icons. Placeholder SVGs in `/public/` are not sufficient.

**2. Search** — simple title + ingredient text search against Supabase. One-day build. A recipe app without search is not usable past 15 recipes.

**3. Password reset** — "Forgot password?" link on `/admin/login` page (below the password field, right-aligned). Clicking it shows a single email input. User submits email → receives a time-limited reset link (store token + expiry in a `password_reset_tokens` table) → lands on a reset page at `/reset-password?token=xxx` → sets new password → redirected to login. Token expires after 1 hour and is single-use.

**4. Account page** (`/account`) — shows:
- Usage meter in the page header: "18 of 30 extractions used this month (resets [Month 1])"
- Note: the counter resets on the 1st of each calendar month. A user who signs up on the 30th gets 1 day at full quota — the UI should display the actual reset date, not "in X days", to avoid confusion
- Change password form
- Account email (read-only)

**5. Privacy policy + Terms of service + Account deletion:**
- Two static pages at `/privacy` and `/terms`
- Both linked from the account page footer
- **Account deletion must be included** — required for GDPR compliance when serving any EU users. Include a "Delete my account" button on the account page that removes the user row (cascades to delete all their recipes via `ON DELETE CASCADE`) and invalidates their session

**6. Onboarding / empty state:**
- Format: **inline banner** (not a modal — modals feel intrusive on mobile)
- Shown only when user has zero recipes
- Copy: "Welcome to your Recipe Book. Add your first recipe using the + button — snap a photo, paste a link, or type it out."
- Banner disappears permanently once the first recipe is added (no cookie needed — just check recipe count)

---

### Expected soon after launch (P1)

**Print view** — `@media print` stylesheet hiding nav/admin chrome + a "Print" button on the recipe detail page.

**Share button** — Web Share API on recipe detail page. Falls back to copy-to-clipboard on desktop. No new route needed — existing `/recipes/[slug]` URLs are already public.

**Tags or categories** — `text[]` column on `recipes`, filter chips on the recipe list.

---

### Nice to have (P2, post-launch)

- Shopping list (aggregate ingredients across recipes)
- Export / backup (download all recipes as JSON or PDF)
- Meal planning

---

## Protecting Against API Abuse (Rate Limiting)

### Approach: Monthly extraction cap tracked in `extractions_log`

The rate limit must track **extraction attempts**, not saved recipe count. Counting recipes is gameable (delete recipes to reset quota) and doesn't accurately reflect API cost (a failed extraction still costs money).

**On each call to `/api/extract`** (before calling Claude):
1. Count rows in `extractions_log` for this user where `created_at >= date_trunc('month', now())`
2. If count >= `user.monthly_limit` → return 429: "You've reached your 30-recipe monthly limit. It resets on [Month 1]."
3. If under limit → insert a row into `extractions_log`, then call Claude

**Why insert before calling Claude:** Prevents a race condition where simultaneous requests both pass the check before either inserts.

**Default limit: 30/month.** At $0.05/extraction worst case (vision), that's $1.50/month per user in API costs. Adjust per user via `users.monthly_limit` for anyone who needs a higher cap.

**Usage meter:** Shown on the account page header — "18 of 30 extractions used this month (resets [date])". The reset date is always the 1st of next month; display the actual date, not a relative countdown.

---

## Known Debt

**In-memory login rate limiter** (`lib/rate-limit.ts`) uses a `Map` that does not persist across Vercel serverless function instances. In practice this means the 5-attempts-per-15-minutes limit is per-instance, not global. For this scale and threat model, this is acceptable. A future fix would use Supabase to store attempt counts.

---

## What This is NOT

- Not a full SaaS with billing portal, subscription management, upgrade/downgrade flows — those live in Lemon Squeezy
- Not storing credit cards — Lemon Squeezy holds all of that
- Not OAuth, not "sign in with Google" — just a password emailed on purchase, changed on first login
- Not an App Store app — PWA is good enough and requires zero Apple/Google approval process

---

## Critical Files to Modify

| File | Change |
|------|--------|
| `lib/auth.ts` | Change return type to `{ valid: true; userId: string; mustChangePassword: boolean } \| { valid: false }` |
| `middleware.ts` | Extract `userId` from session result; forward to route handlers |
| `app/api/admin/login/route.ts` | Query `users` table; handle `must_change_password` redirect |
| `app/api/extract/route.ts` | Check extraction cap via `extractions_log`; insert log entry; pass `userId` to recipe creation |
| `app/api/recipes/route.ts` | Filter all queries by `userId` |
| `app/api/recipes/[id]/route.ts` | Filter all queries by `userId` |
| `app/api/recipes/[id]/image/route.ts` | Filter by `userId` |
| `app/api/webhook/lemon-squeezy/route.ts` | New — `order_created` handler with idempotency check and raw-body signature verification |
| `app/api/account/delete/route.ts` | New — account deletion endpoint |
| `app/reset-password/page.tsx` | New — password reset page |
| `app/account/page.tsx` | New — account page with usage meter, password change, delete |
| `public/manifest.json` | New — PWA manifest |

**New env vars:** `LEMON_SQUEEZY_WEBHOOK_SECRET`, `RESEND_API_KEY`

---

## App Store (Later, Optional)

If the PWA experience ever feels insufficient or the creator wants wider distribution, an App Store app is the natural next step. This would require a React Native / Expo rewrite — significant effort. The PWA path generates learning and revenue first; the App Store is a future bet if there's real demand. Don't build it now.

---

## Verification

- Load the app URL on an iPhone in Safari → verify "Add to Home Screen" prompt appears → app opens fullscreen with no browser chrome
- Confirm 192×192 and 512×512 icons appear correctly on the home screen
- Buy a test product via Lemon Squeezy test mode → confirm webhook fires exactly once (test retry idempotency) → confirm account created → confirm welcome email arrives
- Log in with temporary password → confirm forced password change screen appears → confirm redirect to app after password set
- Log in as two different users, add recipes as each → confirm neither can see the other's recipes
- Trigger 30 extractions as one user → confirm 31st returns 429 with reset date
- Submit "forgot password" → confirm email arrives → confirm token link works → confirm token is single-use
- Delete account → confirm all recipes deleted → confirm session invalidated
- Confirm all recipe endpoints return 401 for unauthenticated requests

---

## Revision History

| Date | Change |
|------|--------|
| 2026-05-17 | Initial plan created |
| 2026-05-17 | VP review applied — 20 issues addressed (see Review Summary above) |
