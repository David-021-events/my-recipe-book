'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { compressImage } from '@/lib/compress'
import type { RecipeExtracted } from '@/lib/extract'

type Tab = 'text' | 'photo' | 'url'

interface IngredientRow {
  name: string
  quantity: string
  unit: string
  hard_to_find: boolean
  substitutions: string[]
}

/**
 * Admin new recipe page with three-tab extraction UI.
 * Handles text, photo, and URL inputs, client-side image compression,
 * editable preview, fallback mode, and save flow.
 */
export default function NewRecipePage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('text')
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState('')
  const [fallbackText, setFallbackText] = useState('')
  const [preview, setPreview] = useState<RecipeExtracted | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Editable preview fields
  const [title, setTitle] = useState('')
  const [servings, setServings] = useState('4')
  const [prepTime, setPrepTime] = useState('')
  const [cookTime, setCookTime] = useState('')
  const [miseEnPlace, setMiseEnPlace] = useState('')
  const [steps, setSteps] = useState('')
  const [ingredients, setIngredients] = useState<IngredientRow[]>([])
  const [status, setStatus] = useState<'draft' | 'published'>('draft')

  function loadPreview(recipe: RecipeExtracted) {
    setPreview(recipe)
    setTitle(recipe.title)
    setServings(String(recipe.servings))
    setPrepTime(recipe.prep_time != null ? String(recipe.prep_time) : '')
    setCookTime(recipe.cook_time != null ? String(recipe.cook_time) : '')
    try {
      const parsed = JSON.parse(recipe.instructions)
      setMiseEnPlace((parsed?.mise_en_place as string[] | undefined)?.join('\n') ?? '')
      setSteps((parsed?.steps as string[] | undefined)?.join('\n') ?? '')
    } catch {
      setMiseEnPlace('')
      setSteps(recipe.instructions)
    }
    setIngredients(
      recipe.ingredients.map((i) => ({
        name: i.name,
        quantity: i.quantity != null ? String(i.quantity) : '',
        unit: i.unit ?? '',
        hard_to_find: i.hard_to_find,
        substitutions: i.substitutions,
      }))
    )
  }

  async function extract(type: 'text' | 'image' | 'url', content: string) {
    setExtracting(true)
    setExtractError('')
    setFallbackText('')
    setPreview(null)

    const res = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, content }),
    })

    setExtracting(false)

    if (res.status === 422) {
      setExtractError('Could not fetch that URL — the site may be blocking automated access. Try pasting the recipe text instead.')
      setTab('text')
      return
    }

    if (res.status === 429) {
      setExtractError('Too many requests — please wait a moment and try again.')
      return
    }

    if (res.status === 503) {
      const errData = await res.json().catch(() => ({} as { error?: string }))
      if (errData.error === 'ai_auth_error') {
        setExtractError('AI service authentication failed. Check the ANTHROPIC_API_KEY environment variable in Vercel.')
      } else {
        setExtractError('AI service error. Please try again — if this persists, check the Vercel function logs for details.')
      }
      return
    }

    if (!res.ok) {
      setExtractError('Extraction failed. Please try again.')
      return
    }

    const data = await res.json()

    if (data.success === false && data.fallback) {
      if (data.rawText) {
        setFallbackText(data.rawText)
      } else {
        setExtractError('Extraction failed — Claude could not parse a recipe from this content. Try pasting the text instead.')
        setTab('text')
      }
      return
    }

    if (data.success) {
      loadPreview(data.recipe as RecipeExtracted)
    }
  }

  async function handleExtractText() {
    if (!text.trim()) return
    await extract('text', text)
  }

  async function handleExtractPhoto() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setExtracting(true)
    setExtractError('')
    try {
      const base64 = await compressImage(file)
      await extract('image', base64)
    } catch {
      setExtracting(false)
      setExtractError('Could not read image. Try a different file.')
    }
  }

  async function handleExtractUrl() {
    if (!url.trim()) return
    await extract('url', url)
  }

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

  async function handleSave() {
    setSaving(true)
    setSaveError('')

    const body = {
      title,
      servings: parseInt(servings, 10) || 4,
      prep_time: prepTime ? parseInt(prepTime, 10) : null,
      cook_time: cookTime ? parseInt(cookTime, 10) : null,
      instructions: (() => {
        const mep = miseEnPlace.split('\n').map((s) => s.trim()).filter(Boolean)
        const st = steps.split('\n').map((s) => s.trim()).filter(Boolean)
        if (mep.length === 0 && st.length === 0) return null
        return JSON.stringify({ mise_en_place: mep, steps: st })
      })(),
      status,
      raw_input: text || null,
      ingredients: ingredients.map((row) => ({
        name: row.name,
        quantity: row.quantity ? parseFloat(row.quantity) : null,
        unit: row.unit || null,
        hard_to_find: row.hard_to_find,
        substitutions: row.substitutions,
      })),
    }

    const res = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      router.refresh()
      router.push('/admin')
    } else {
      const json = await res.json()
      setSaveError(json.error ?? 'Failed to save.')
      setSaving(false)
    }
  }

  const inputClass =
    'w-full border border-neutral-200 rounded-md px-3 py-2.5 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-sans text-sm text-neutral-900 placeholder:text-neutral-400'
  const labelClass = 'block font-sans text-sm font-medium text-neutral-700 mb-1'

  const tabClass = (t: Tab) =>
    `px-4 py-2.5 font-sans text-sm font-medium border-b-2 -mb-px transition-colors ${
      tab === t
        ? 'text-brand-500 border-brand-500'
        : 'text-neutral-500 hover:text-neutral-700 border-transparent'
    }`

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-neutral-900 mb-6">New Recipe</h1>

      {/* Tab bar */}
      <div role="tablist" aria-label="Recipe input method" className="flex border-b border-brand-200 mb-6">
        <button role="tab" aria-selected={tab === 'text'} className={tabClass('text')} onClick={() => setTab('text')}>Paste Text</button>
        <button role="tab" aria-selected={tab === 'photo'} className={tabClass('photo')} onClick={() => setTab('photo')}>Upload Photo</button>
        <button role="tab" aria-selected={tab === 'url'} className={tabClass('url')} onClick={() => setTab('url')}>Paste URL</button>
      </div>

      {extractError && (
        <p className="font-sans text-sm text-red-600 mb-4">{extractError}</p>
      )}

      {/* Paste Text tab */}
      {tab === 'text' && !preview && !fallbackText && (
        <div className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="Paste your recipe text here…"
            className={inputClass}
          />
          <button
            onClick={handleExtractText}
            disabled={extracting || !text.trim()}
            className="bg-brand-500 hover:bg-brand-600 text-white font-sans font-semibold text-sm px-5 py-2.5 rounded-md transition-colors min-h-[44px] disabled:opacity-50"
          >
            {extracting ? 'Extracting…' : 'Extract Recipe'}
          </button>
        </div>
      )}

      {/* Upload Photo tab */}
      {tab === 'photo' && !preview && !fallbackText && (
        <div className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png"
            aria-label="Recipe photo (JPEG or PNG)"
            className="block font-sans text-sm text-neutral-700"
          />
          <p className="font-sans text-xs text-neutral-500">
            Image will be compressed to ~400KB before uploading.
          </p>
          <button
            onClick={handleExtractPhoto}
            disabled={extracting}
            className="bg-brand-500 hover:bg-brand-600 text-white font-sans font-semibold text-sm px-5 py-2.5 rounded-md transition-colors min-h-[44px] disabled:opacity-50"
          >
            {extracting ? 'Extracting…' : 'Extract Recipe'}
          </button>
        </div>
      )}

      {/* Paste URL tab */}
      {tab === 'url' && !preview && !fallbackText && (
        <div className="space-y-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.example.com/recipe"
            className={inputClass}
          />
          <button
            onClick={handleExtractUrl}
            disabled={extracting || !url.trim()}
            className="bg-brand-500 hover:bg-brand-600 text-white font-sans font-semibold text-sm px-5 py-2.5 rounded-md transition-colors min-h-[44px] disabled:opacity-50"
          >
            {extracting ? 'Extracting…' : 'Extract Recipe'}
          </button>
        </div>
      )}

      {/* Fallback mode */}
      {fallbackText && !preview && (
        <div className="space-y-4">
          <p className="font-sans text-sm text-warning-500">
            Extraction failed — edit the text below and save manually.
          </p>
          <textarea
            value={fallbackText}
            onChange={(e) => setFallbackText(e.target.value)}
            rows={12}
            className={inputClass}
          />
          <div className="space-y-3">
            <div>
              <label htmlFor="fb-title" className={labelClass}>Title</label>
              <input id="fb-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
            </div>
            <button
              onClick={() => {
                setPreview({ title, servings: parseInt(servings, 10) || 4, instructions: fallbackText, ingredients: [] })
                setMiseEnPlace('')
                setSteps(fallbackText)
              }}
              className="bg-brand-500 hover:bg-brand-600 text-white font-sans font-semibold text-sm px-5 py-2.5 rounded-md transition-colors min-h-[44px]"
            >
              Continue to Edit
            </button>
          </div>
        </div>
      )}

      {/* Editable preview */}
      {preview && (
        <div className="bg-white rounded-lg border border-neutral-200 p-6 space-y-5">
          <div>
            <label htmlFor="p-title" className={labelClass}>Title</label>
            <input id="p-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="p-servings" className={labelClass}>Servings</label>
              <input id="p-servings" type="number" value={servings} onChange={(e) => setServings(e.target.value)} min={1} className={inputClass} />
            </div>
            <div>
              <label htmlFor="p-status" className={labelClass}>Status</label>
              <select id="p-status" value={status} onChange={(e) => setStatus(e.target.value as 'draft' | 'published')} className={inputClass}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="p-prep-time" className={labelClass}>Prep time (min)</label>
              <input id="p-prep-time" type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} min={1} placeholder="—" className={inputClass} />
            </div>
            <div>
              <label htmlFor="p-cook-time" className={labelClass}>Cook time (min)</label>
              <input id="p-cook-time" type="number" value={cookTime} onChange={(e) => setCookTime(e.target.value)} min={1} placeholder="—" className={inputClass} />
            </div>
          </div>

          {/* Ingredients */}
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
                    {['tsp','tbsp','cup','oz','lb','ml','g','kg','clove','pinch','count'].map((u) => (
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
              onClick={addIngredient}
              className="mt-2 font-sans text-sm text-brand-500 hover:text-brand-600"
            >
              + Add ingredient
            </button>
          </div>

          <div>
            <label htmlFor="p-mise-en-place" className={labelClass}>Mise en Place</label>
            <textarea
              id="p-mise-en-place"
              value={miseEnPlace}
              onChange={(e) => setMiseEnPlace(e.target.value)}
              rows={4}
              placeholder={"Preheat oven to 180°C\nDice the onion…"}
              className={inputClass}
            />
            <p className="font-sans text-xs text-neutral-400 mt-1">One preparation step per line.</p>
          </div>

          <div>
            <label htmlFor="p-steps" className={labelClass}>Cooking Steps</label>
            <textarea
              id="p-steps"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              rows={8}
              placeholder={"Heat oil in a large pan over medium heat\nAdd onion and cook until softened…"}
              className={inputClass}
            />
            <p className="font-sans text-xs text-neutral-400 mt-1">One step per line. Steps are numbered automatically.</p>
          </div>

          {saveError && <p className="font-sans text-sm text-red-600">{saveError}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => { setPreview(null); setFallbackText('') }}
              className="border border-brand-200 text-neutral-700 hover:bg-brand-100 font-sans font-semibold text-sm px-5 py-2.5 rounded-md transition-colors min-h-[44px]"
            >
              Back
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-brand-500 hover:bg-brand-600 text-white font-sans font-semibold text-sm px-5 py-2.5 rounded-md transition-colors min-h-[44px] disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Recipe'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
