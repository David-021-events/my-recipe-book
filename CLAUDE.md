# my-recipe-book

Personal recipe book. Extracts and stores recipes from text/photos using Claude vision.

> **Standards**: [standards.md](standards.md)

---

## Stack

- **Framework**: Next.js (App Router)
- **Database**: Supabase Postgres
- **Hosting**: Vercel
- **AI**: Anthropic Claude API (vision + text extraction)

## Key Files

- `/lib/extract.ts` — Claude extraction logic (isolated; swap here to change AI provider)
- `/lib/supabase.ts` — DB client
- `/lib/auth.ts` — cookie-based admin auth
- `/app/api/extract/route.ts` — photo/text → recipe JSON endpoint

## Build Commands

```bash
npm run dev        # local dev
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

## Architecture Notes

- Images are **never stored** — compress client-side → extract → discard
- Client-side image compression to ~400KB before upload (Canvas API, no library)
- `/api/extract` uses `export const maxDuration = 60` for Claude vision timeout
- `ingredients` stored as JSONB — do not normalize to a separate table until 50+ recipes feels painful

## Pre-Commit Checklist

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] No `console.log` in committed code
- [ ] No hardcoded secrets (use env vars)
