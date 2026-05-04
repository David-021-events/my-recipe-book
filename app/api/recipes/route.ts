import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { getAdminSession } from '@/lib/auth'
import { RecipeInputSchema } from '@/lib/schemas'

/**
 * GET /api/recipes — Returns the list of published recipes (summary fields only), ordered newest first.
 */
export async function GET() {
  const { data, error } = await supabase
    .from('recipes')
    .select('id, title, servings, image_url, prep_time, cook_time, created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

/**
 * POST /api/recipes — Creates a new recipe. Requires a valid admin session cookie.
 * @param request - The incoming request containing the recipe JSON body.
 */
export async function POST(request: NextRequest) {
  if (!getAdminSession(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = RecipeInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('recipes')
    .insert(parsed.data)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
