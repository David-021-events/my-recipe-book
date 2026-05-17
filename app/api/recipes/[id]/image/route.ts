import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { uploadRecipeImage, deleteRecipeImage } from '@/lib/storage'

/**
 * POST /api/recipes/[id]/image — Uploads a recipe image. Scoped to the authenticated user.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession(request)
  if (!session.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  // Verify the recipe belongs to this user before uploading
  const { data: recipe } = await supabaseAdmin
    .from('recipes')
    .select('id')
    .eq('id', id)
    .eq('user_id', session.userId)
    .single()

  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { base64 } = await request.json() as { base64: string }
  const image_url = await uploadRecipeImage(id, base64)
  await supabaseAdmin.from('recipes').update({ image_url }).eq('id', id)
  return NextResponse.json({ image_url })
}

/**
 * DELETE /api/recipes/[id]/image — Removes the recipe image. Scoped to the authenticated user.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession(request)
  if (!session.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  const { data: recipe } = await supabaseAdmin
    .from('recipes')
    .select('id')
    .eq('id', id)
    .eq('user_id', session.userId)
    .single()

  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await deleteRecipeImage(id)
  await supabaseAdmin.from('recipes').update({ image_url: null }).eq('id', id)
  return new NextResponse(null, { status: 204 })
}
