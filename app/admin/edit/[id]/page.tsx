import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { getAdminSessionServer } from '@/lib/auth'
import type { Recipe } from '@/lib/types'
import EditRecipeClient from './EditRecipeClient'

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getAdminSessionServer()
  if (!session.valid) notFound()

  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('recipes')
    .select('*')
    .eq('id', id)
    .eq('user_id', session.userId)
    .single()

  if (error || !data) notFound()

  return <EditRecipeClient recipe={data as Recipe} />
}
