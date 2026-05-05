import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import type { Recipe } from '@/lib/types'
import EditRecipeClient from './EditRecipeClient'

/**
 * Admin edit recipe page — server component that fetches the recipe by ID
 * (bypassing RLS so drafts are accessible) and passes it to the client form.
 */
export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('recipes')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  return <EditRecipeClient recipe={data as Recipe} />
}
