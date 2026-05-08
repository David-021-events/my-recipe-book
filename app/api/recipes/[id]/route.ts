import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { getAdminSession } from '@/lib/auth'
import { RecipeInputSchema } from '@/lib/schemas'
import { slugify } from '@/lib/slugify'

/**
 * GET /api/recipes/[id] — Returns a single published recipe by ID.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

/**
 * PUT /api/recipes/[id] — Replaces a recipe. Requires a valid admin session cookie.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await getAdminSession(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const parsed = RecipeInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const slug = await uniqueSlug(parsed.data.title, id)

  const { data, error } = await supabaseAdmin
    .from('recipes')
    .update({ ...parsed.data, slug, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

/**
 * DELETE /api/recipes/[id] — Deletes a recipe. Requires a valid admin session cookie.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await getAdminSession(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { error } = await supabaseAdmin
    .from('recipes')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}

async function uniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title)
  const query = supabaseAdmin.from('recipes').select('slug').like('slug', `${base}%`)
  if (excludeId) query.neq('id', excludeId)
  const { data } = await query
  const existing = new Set(data?.map((r) => r.slug) ?? [])
  let candidate = base
  let i = 2
  while (existing.has(candidate)) {
    candidate = `${base}-${i++}`
  }
  return candidate
}
