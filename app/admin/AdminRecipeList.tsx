'use client'

import type { Recipe } from '@/lib/types'

type RecipeSummary = Pick<Recipe, 'id' | 'title' | 'status' | 'created_at' | 'servings' | 'slug'>

interface Props {
  recipes: RecipeSummary[]
}

/** Status pill badge — hoisted to module level to preserve stable component identity across renders. */
function StatusBadge({ status }: { status: string }) {
  return status === 'published' ? (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
      Published
    </span>
  ) : (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-600">
      Draft
    </span>
  )
}

/**
 * Client component rendering the admin recipe table with edit and delete actions.
 * Delete shows a confirm dialog before calling the API.
 */
export default function AdminRecipeList({ recipes }: Props) {
  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    const res = await fetch(`/api/recipes/${id}`, { method: 'DELETE' })
    if (res.ok) {
      window.location.reload()
    } else {
      alert('Failed to delete recipe.')
    }
  }

  if (recipes.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
        <p className="font-sans text-neutral-500">No recipes yet.</p>
        <a href="/admin/new" className="font-sans text-sm text-brand-500 hover:text-brand-600 mt-2 inline-block">
          Add your first recipe →
        </a>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">

      {/* Mobile stacked list */}
      <div className="divide-y divide-neutral-200 sm:hidden">
        {recipes.map((recipe) => (
          <div key={recipe.id} className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-sans text-sm font-medium text-neutral-900 truncate">{recipe.title}</p>
              <div className="mt-1"><StatusBadge status={recipe.status} /></div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {recipe.status === 'published' && (
                <a
                  href={`/recipes/${recipe.slug}`}
                  className="font-sans text-sm text-neutral-500 hover:text-neutral-700"
                >
                  View
                </a>
              )}
              <a
                href={`/admin/edit/${recipe.id}`}
                className="font-sans text-sm font-medium text-brand-500 hover:text-brand-600"
              >
                Edit
              </a>
              <button
                onClick={() => handleDelete(recipe.id, recipe.title)}
                className="font-sans text-sm text-red-600 hover:text-red-700 underline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-hidden rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="text-left font-sans text-xs font-semibold uppercase tracking-wider text-neutral-500 px-6 py-3">
                Title
              </th>
              <th className="text-left font-sans text-xs font-semibold uppercase tracking-wider text-neutral-500 px-6 py-3">
                Status
              </th>
              <th className="text-left font-sans text-xs font-semibold uppercase tracking-wider text-neutral-500 px-6 py-3">
                Created
              </th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {recipes.map((recipe) => (
              <tr key={recipe.id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-6 py-4 font-sans text-sm font-medium text-neutral-900">
                  {recipe.title}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={recipe.status} />
                </td>
                <td className="px-6 py-4 font-sans text-sm text-neutral-500">
                  {new Date(recipe.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right space-x-4">
                  {recipe.status === 'published' && (
                    <a
                      href={`/recipes/${recipe.slug}`}
                      className="font-sans text-sm text-neutral-500 hover:text-neutral-700"
                    >
                      View
                    </a>
                  )}
                  <a
                    href={`/admin/edit/${recipe.id}`}
                    className="font-sans text-sm font-medium text-brand-500 hover:text-brand-600"
                  >
                    Edit
                  </a>
                  <button
                    onClick={() => handleDelete(recipe.id, recipe.title)}
                    className="font-sans text-sm text-red-600 hover:text-red-700 underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}
