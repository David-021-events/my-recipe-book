import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { uploadRecipeImage, deleteRecipeImage } from '@/lib/storage'

/**
 * POST /api/recipes/[id]/image — Uploads a recipe image to Supabase Storage and saves the URL.
 * @param request - JSON body: `{ base64: string }` (compressed JPEG as base64)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await getAdminSession(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const { base64 } = await request.json() as { base64: string }
  const image_url = await uploadRecipeImage(id, base64)
  await supabaseAdmin.from('recipes').update({ image_url }).eq('id', id)
  return NextResponse.json({ image_url })
}

/**
 * DELETE /api/recipes/[id]/image — Removes the recipe image from storage and clears the URL.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await getAdminSession(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  await deleteRecipeImage(id)
  await supabaseAdmin.from('recipes').update({ image_url: null }).eq('id', id)
  return new NextResponse(null, { status: 204 })
}
