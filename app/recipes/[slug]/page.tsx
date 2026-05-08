import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Recipe } from '@/lib/types'
import RecipeDetail from '@/components/RecipeDetail'

/**
 * Public recipe detail page — fetches a published recipe by slug.
 * Returns 404 for drafts and missing recipes.
 */
export default async function RecipePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error || !data) notFound()

  return <RecipeDetail recipe={data as Recipe} />
}
