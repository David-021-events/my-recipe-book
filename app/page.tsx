import { supabaseAdmin } from '@/lib/supabase'
import RecipeCard from '@/components/RecipeCard'
import { getAdminSessionServer } from '@/lib/auth'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

/**
 * Public homepage — grid of published recipes.
 * Uses the admin Supabase client server-side to bypass RLS; the .eq('status', 'published')
 * filter ensures only published recipes are returned.
 */
export default async function Home() {
  const [{ data: recipes }, isAdmin] = await Promise.all([
    supabaseAdmin
      .from('recipes')
      .select('id, title, servings, image_url')
      .eq('status', 'published')
      .order('created_at', { ascending: false }),
    getAdminSessionServer(),
  ])

  return (
    <div className="min-h-screen bg-brand-50">
      <nav className="bg-white border-b border-brand-200">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-15">
          <span className="font-display italic font-semibold text-xl text-neutral-900">
            My Recipe Book
          </span>
          {isAdmin && (
            <Link
              href="/admin"
              className="font-sans text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              Admin
            </Link>
          )}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {!recipes || recipes.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-sans text-neutral-500">No recipes yet. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                id={recipe.id}
                title={recipe.title}
                servings={recipe.servings}
                image_url={recipe.image_url}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
