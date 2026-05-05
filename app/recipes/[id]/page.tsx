import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Recipe } from '@/lib/types'
import RecipeDetail from '@/components/RecipeDetail'

/**
 * Public recipe detail page — server component that fetches a published recipe by ID.
 * Returns 404 for drafts and missing recipes.
 */
export default async function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .single()

  if (error || !data) notFound()

  return <RecipeDetail recipe={data as Recipe} />
}
