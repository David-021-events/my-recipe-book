import { supabaseAdmin } from '@/lib/supabase'
import type { Recipe } from '@/lib/types'
import AdminRecipeList from './AdminRecipeList'

export const dynamic = 'force-dynamic'

/**
 * Admin recipes list page — server component that fetches all recipes (draft + published)
 * and passes them to the client list component for rendering and interactions.
 */
export default async function AdminPage() {
  const { data, error } = await supabaseAdmin
    .from('recipes')
    .select('id, title, status, created_at, servings, slug')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <p className="font-sans text-sm text-red-600">
        Failed to load recipes: {error.message}
      </p>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Recipes</h1>
        <a
          href="/admin/new"
          className="bg-brand-500 hover:bg-brand-600 text-white font-sans font-semibold text-sm px-5 py-2.5 rounded-md transition-colors"
        >
          Add Recipe
        </a>
      </div>
      <AdminRecipeList recipes={(data ?? []) as Pick<Recipe, 'id' | 'title' | 'status' | 'created_at' | 'servings' | 'slug'>[]} />
    </div>
  )
}
