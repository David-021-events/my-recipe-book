'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RecipeForm from '../../RecipeForm'
import type { RecipeFormData } from '../../RecipeForm'
import type { Recipe } from '@/lib/types'

interface Props {
  recipe: Recipe
}

/**
 * Client component for the edit recipe page.
 * Handles save (PUT) and delete with confirmation.
 */
export default function EditRecipeClient({ recipe }: Props) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave(data: RecipeFormData) {
    setSaving(true)
    setError('')
    const res = await fetch(`/api/recipes/${recipe.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      router.refresh()
      router.push('/admin')
    } else {
      const json = await res.json()
      setError(json.error ?? 'Failed to save recipe.')
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${recipe.title}"? This cannot be undone.`)) return
    const res = await fetch(`/api/recipes/${recipe.id}`, { method: 'DELETE' })
    if (res.ok) {
      router.refresh()
      router.push('/admin')
    } else {
      setError('Failed to delete recipe.')
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-neutral-900 mb-6">Edit Recipe</h1>
      {error && <p className="font-sans text-sm text-red-600 mb-4">{error}</p>}
      <RecipeForm
        initial={{
          title: recipe.title,
          servings: recipe.servings,
          instructions: recipe.instructions,
          ingredients: recipe.ingredients,
          raw_input: recipe.raw_input,
          status: recipe.status,
          prep_time: recipe.prep_time,
          cook_time: recipe.cook_time,
        }}
        onSave={handleSave}
        saving={saving}
        recipeId={recipe.id}
        imageUrl={recipe.image_url}
      />
      <div className="mt-6 pt-6 border-t border-neutral-200">
        <button
          onClick={handleDelete}
          className="font-sans text-sm text-red-600 hover:text-red-700 underline"
        >
          Delete recipe
        </button>
      </div>
    </div>
  )
}
