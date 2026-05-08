'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Ingredient } from '@/lib/types'
import { compressImage } from '@/lib/compress'

/**
 * Shape of the data collected by RecipeForm and passed to the onSave callback.
 * Mirrors the writable columns of the recipes table.
 */
export interface RecipeFormData {
  title: string
  servings: number
  instructions: string | null
  ingredients: Ingredient[] | null
  raw_input: string | null
  status: 'draft' | 'published'
  prep_time: number | null
  cook_time: number | null
}

interface IngredientRow {
  name: string
  quantity: string
  unit: string
  hard_to_find: boolean
  substitutions: string[]
}

interface Props {
  initial?: Partial<RecipeFormData>
  onSave: (data: RecipeFormData) => void
  saving: boolean
  recipeId: string
  imageUrl?: string | null
}

const UNITS = ['tsp', 'tbsp', 'cup', 'oz', 'lb', 'ml', 'g', 'kg', 'clove', 'pinch', 'count']

function toRows(ingredients: Ingredient[] | null | undefined): IngredientRow[] {
  if (!ingredients) return []
  return ingredients.map((i) => ({
    name: i.name,
    quantity: i.quantity != null ? String(i.quantity) : '',
    unit: i.unit ?? '',
    hard_to_find: i.hard_to_find,
    substitutions: i.substitutions,
  }))
}

/**
 * Shared recipe form used by the edit admin page.
 * Uses a per-row ingredient editor instead of raw JSON.
 */
export default function RecipeForm({ initial, onSave, saving, recipeId, imageUrl: initialImageUrl }: Props) {
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(initialImageUrl ?? null)
  const [imageUploading, setImageUploading] = useState(false)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [servings, setServings] = useState(String(initial?.servings ?? 4))
  const [prepTime, setPrepTime] = useState(String(initial?.prep_time ?? ''))
  const [cookTime, setCookTime] = useState(String(initial?.cook_time ?? ''))
  const [miseEnPlace, setMiseEnPlace] = useState(() => {
    try {
      const parsed = JSON.parse(initial?.instructions ?? '')
      return (parsed?.mise_en_place as string[] | undefined)?.join('\n') ?? ''
    } catch { return '' }
  })
  const [steps, setSteps] = useState(() => {
    try {
      const parsed = JSON.parse(initial?.instructions ?? '')
      return (parsed?.steps as string[] | undefined)?.join('\n') ?? ''
    } catch { return initial?.instructions ?? '' }
  })
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    toRows(initial?.ingredients as Ingredient[] | null | undefined)
  )
  const [status, setStatus] = useState<'draft' | 'published'>(initial?.status ?? 'draft')

  function updateIngredient(i: number, field: keyof IngredientRow, value: string | boolean) {
    setIngredients((prev) => prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)))
  }

  function addIngredient() {
    setIngredients((prev) => [
      ...prev,
      { name: '', quantity: '', unit: '', hard_to_find: false, substitutions: [] },
    ])
  }

  function removeIngredient(i: number) {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageUploading(true)
    try {
      const base64 = await compressImage(file)
      const res = await fetch(`/api/recipes/${recipeId}/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64 }),
      })
      if (res.ok) {
        const data = await res.json() as { image_url: string }
        setCurrentImageUrl(`${data.image_url}?t=${Date.now()}`)
      }
    } finally {
      setImageUploading(false)
    }
  }

  async function handleImageRemove() {
    await fetch(`/api/recipes/${recipeId}/image`, { method: 'DELETE' })
    setCurrentImageUrl(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      title,
      servings: parseInt(servings, 10) || 4,
      instructions: (() => {
        const mep = miseEnPlace.split('\n').map((s) => s.trim()).filter(Boolean)
        const st = steps.split('\n').map((s) => s.trim()).filter(Boolean)
        if (mep.length === 0 && st.length === 0) return null
        return JSON.stringify({ mise_en_place: mep, steps: st })
      })(),
      ingredients: ingredients.map((row) => ({
        name: row.name,
        quantity: row.quantity ? parseFloat(row.quantity) : null,
        unit: (row.unit as Ingredient['unit']) || null,
        hard_to_find: row.hard_to_find,
        substitutions: row.substitutions,
      })),
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
        <p className={labelClass}>Recipe Image</p>
        {currentImageUrl ? (
          <div className="space-y-2">
            <div className="relative w-full h-48 rounded-md overflow-hidden">
              <Image src={currentImageUrl} alt="Recipe" fill sizes="(max-width: 768px) 100vw, 672px" className="object-cover" />
            </div>
            <div className="flex gap-4">
              <label className="font-sans text-sm text-brand-500 hover:text-brand-600 cursor-pointer">
                {imageUploading ? 'Uploading…' : 'Replace'}
                <input type="file" accept="image/jpeg,image/png" className="sr-only" onChange={handleImageChange} disabled={imageUploading} />
              </label>
              <button type="button" onClick={handleImageRemove} className="font-sans text-sm text-red-500 hover:text-red-700">
                Remove
              </button>
            </div>
          </div>
        ) : (
          <label className="font-sans text-sm text-brand-500 hover:text-brand-600 cursor-pointer">
            {imageUploading ? 'Uploading…' : '+ Add image'}
            <input type="file" accept="image/jpeg,image/png" className="sr-only" onChange={handleImageChange} disabled={imageUploading} />
          </label>
        )}
      </div>

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
        <p className={labelClass}>Ingredients</p>
        <div className="space-y-2">
          {ingredients.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={row.quantity}
                onChange={(e) => updateIngredient(i, 'quantity', e.target.value)}
                placeholder="Qty"
                className="w-16 border border-neutral-200 rounded-md px-2 py-2 font-sans text-sm text-neutral-900"
              />
              <select
                value={row.unit}
                onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                className="border border-neutral-200 rounded-md px-2 py-2 font-sans text-sm text-neutral-900 bg-white"
              >
                <option value="">—</option>
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <input
                type="text"
                value={row.name}
                onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                placeholder="Ingredient name"
                className="flex-1 border border-neutral-200 rounded-md px-3 py-2 font-sans text-sm text-neutral-900"
              />
              <button
                type="button"
                onClick={() => removeIngredient(i)}
                className="font-sans text-sm text-red-500 hover:text-red-700 px-1"
                aria-label="Remove ingredient"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addIngredient}
          className="mt-2 font-sans text-sm text-brand-500 hover:text-brand-600"
        >
          + Add ingredient
        </button>
      </div>

      <div>
        <label htmlFor="rf-mise-en-place" className={labelClass}>Mise en Place</label>
        <textarea
          id="rf-mise-en-place"
          value={miseEnPlace}
          onChange={(e) => setMiseEnPlace(e.target.value)}
          rows={4}
          placeholder={"Preheat oven to 180°C\nDice the onion\nMeasure out the flour…"}
          className={inputClass}
        />
        <p className="font-sans text-xs text-neutral-400 mt-1">One preparation step per line.</p>
      </div>

      <div>
        <label htmlFor="rf-steps" className={labelClass}>Cooking Steps</label>
        <textarea
          id="rf-steps"
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          rows={8}
          placeholder={"Heat oil in a large pan over medium heat\nAdd onion and cook until softened…"}
          className={inputClass}
        />
        <p className="font-sans text-xs text-neutral-400 mt-1">One step per line. Steps are numbered automatically.</p>
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
