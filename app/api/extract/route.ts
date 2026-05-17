import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSession } from '@/lib/auth'
import { extractRecipe } from '@/lib/extract'

export const maxDuration = 60

const ExtractRequestSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), content: z.string().min(1) }),
  z.object({ type: z.literal('url'), content: z.string().min(1) }),
  // Max 3 images keeps payload well under Vercel's 4.5MB body limit (~1.6MB for 3 × 400KB compressed)
  z.object({ type: z.literal('image'), content: z.array(z.string().min(1)).min(1).max(3) }),
])

/**
 * POST /api/extract — Extracts a structured recipe from text, image (base64), or URL.
 * Requires a valid admin session cookie.
 * @param request - JSON body: `{ type: 'text' | 'url', content: string }` or `{ type: 'image', content: string[] }` (1–3 base64 images)
 */
export async function POST(request: NextRequest) {
  if (!await getAdminSession(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: unknown = await request.json()
  const parsed = ExtractRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Missing or invalid type or content' }, { status: 400 })
  }
  const { type, content } = parsed.data

  try {
    if (type === 'text') {
      const result = await extractRecipe({ type: 'text', text: content })
      return NextResponse.json(result)
    }

    if (type === 'url') {
      const result = await extractRecipe({ type: 'url', url: content })
      if (!result.success && !result.fallback) {
        return NextResponse.json({ error: result.error }, { status: 422 })
      }
      return NextResponse.json(result)
    }

    if (type === 'image') {
      const images = content.map((data) => ({
        data,
        // Standard JPEG base64 starts with /9j; PNG starts with iVBORw — reliable for Canvas-compressed output
        mediaType: (data.startsWith('/9j') ? 'image/jpeg' : 'image/png') as 'image/jpeg' | 'image/png',
      }))
      const result = await extractRecipe({ type: 'image', images })
      return NextResponse.json(result)
    }
  } catch (err) {
    const apiErr = err as { status?: number; message?: string }
    console.error('[/api/extract] error:', apiErr?.status, apiErr?.message ?? String(err))

    if (apiErr?.status === 429) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
    }
    if (apiErr?.status === 401 || apiErr?.status === 403) {
      return NextResponse.json({ error: 'ai_auth_error' }, { status: 503 })
    }
    return NextResponse.json({ error: 'ai_error' }, { status: 503 })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
