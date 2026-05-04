'use client'

import { useState } from 'react'

/**
 * Shape of the data collected by RecipeForm and passed to the onSave callback.
 * Mirrors the writable columns of the recipes table.
 */
export interface RecipeFormData {
  title: string
  servings: number
  instructions: string | null
  ingredients: unknown[] | null
  raw_input: string | null
  status: 'draft' | 'published'
  prep_time: number | null
  cook_time: number | null
}

interface Props {
  initial?: Partial<RecipeFormData>
  onSave: (data: RecipeFormData) => void
  saving: boolean
}

/**
 * Shared recipe form used by both the new and edit admin pages.
 * Ingredients are entered as raw JSON text and parsed on submit.
 */
export default function RecipeForm({ initial, onSave, saving }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [servings, setServings] = useState(String(initial?.servings ?? 4))
  const [prepTime, setPrepTime] = useState(String(initial?.prep_time ?? ''))
  const [cookTime, setCookTime] = useState(String(initial?.cook_time ?? ''))
  const [instructions, setInstructions] = useState(initial?.instructions ?? '')
  const [ingredientsRaw, setIngredientsRaw] = useState(
    initial?.ingredients ? JSON.stringify(initial.ingredients, null, 2) : ''
  )
  const [status, setStatus] = useState<'draft' | 'published'>(initial?.status ?? 'draft')
  const [jsonError, setJsonError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setJsonError('')

    let ingredients: unknown[] | null = null
    if (ingredientsRaw.trim()) {
      try {
        ingredients = JSON.parse(ingredientsRaw)
      } catch {
        setJsonError('Ingredients JSON is invalid. Check the format.')
        return
      }
    }

    onSave({
      title,
      servings: parseInt(servings, 10) || 4,
      instructions: instructions || null,
      ingredients,
      raw_input: null,
      status,
      prep_time: prepTime ? parseInt(prepTime, 10) : null,
      cook_time: cookTime ? parseInt(cookTime, 10) : null,
    })
  }

  const inputClass =
    'w-full border border-neutral-200 rounded-md px-3 py-2.5 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-sans text-sm text-neutral-900 placeholder:text-neutral-400'
  const labelClass = 'block font-sans text-sm font-medium text-neutral-700 mb-1'

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-neutral-200 p-6 space-y-5">
      <div>
        <label htmlFor="rf-title" className={labelClass}>Title</label>
        <input
          id="rf-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="e.g. Spaghetti Carbonara"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="rf-servings" className={labelClass}>Servings</label>
          <input
            id="rf-servings"
            type="number"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            min={1}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="rf-prep-time" className={labelClass}>Prep time (min)</label>
          <input
            id="rf-prep-time"
            type="number"
            value={prepTime}
            onChange={(e) => setPrepTime(e.target.value)}
            min={1}
            placeholder="—"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="rf-cook-time" className={labelClass}>Cook time (min)</label>
          <input
            id="rf-cook-time"
            type="number"
            value={cookTime}
            onChange={(e) => setCookTime(e.target.value)}
            min={1}
            placeholder="—"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="rf-ingredients" className={labelClass}>
          Ingredients{' '}
          <span className="font-normal text-neutral-500">(JSON array — populated automatically by extraction in Step 7)</span>
        </label>
        <textarea
          id="rf-ingredients"
          value={ingredientsRaw}
          onChange={(e) => setIngredientsRaw(e.target.value)}
          rows={6}
          placeholder='[{"name":"flour","quantity":2,"unit":"cup","hard_to_find":false,"substitutions":[]}]'
          className={inputClass}
        />
        {jsonError && <p className="font-sans text-xs text-red-600 mt-1">{jsonError}</p>}
      </div>

      <div>
        <label htmlFor="rf-instructions" className={labelClass}>Instructions</label>
        <textarea
          id="rf-instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={8}
          placeholder="Step-by-step instructions…"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="rf-status" className={labelClass}>Status</label>
        <select
          id="rf-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
          className={inputClass}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-brand-500 hover:bg-brand-600 text-white font-sans font-semibold text-sm px-5 py-2.5 rounded-md transition-colors min-h-[44px] disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Recipe'}
        </button>
      </div>
    </form>
  )
}
