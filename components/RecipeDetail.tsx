'use client'

import { useState } from 'react'
import Link from 'next/link'
import { convertIngredient } from '@/lib/convert'
import type { Recipe, StructuredInstructions } from '@/lib/types'

interface Props {
  recipe: Recipe
}

function parseInstructions(raw: string | null): StructuredInstructions | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'steps' in parsed &&
      Array.isArray((parsed as { steps: unknown }).steps)
    ) {
      return parsed as StructuredInstructions
    }
  } catch {}
  return null
}

/**
 * Public recipe detail client component.
 * Holds unit system state and converts ingredients on each render — no server round-trip.
 */
export default function RecipeDetail({ recipe }: Props) {
  const [unit, setUnit] = useState<'imperial' | 'metric'>('imperial')

  const ingredients = (recipe.ingredients ?? []).map((i) => convertIngredient(i, unit))
  const structured = parseInstructions(recipe.instructions)
  const h2Class = 'font-display text-[1.375rem] font-semibold leading-snug text-neutral-900 mb-4'

  return (
    <div className="min-h-screen bg-brand-50">
      <nav className="bg-white border-b border-brand-200">
        <div className="max-w-6xl mx-auto px-4 flex items-center h-15">
          <Link href="/" className="font-display italic font-semibold text-xl text-neutral-900">
            My Recipe Book
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-10">
        {/* Title */}
        <h1 className="font-display text-4xl font-bold leading-tight text-neutral-900">
          {recipe.title}
        </h1>

        {/* Metadata bar */}
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <span className="font-sans text-[0.8125rem] text-neutral-500">
            {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}
          </span>
          {recipe.prep_time && (
            <span className="font-sans text-[0.8125rem] text-neutral-500">
              {recipe.prep_time} min prep
            </span>
          )}
          {recipe.cook_time && (
            <span className="font-sans text-[0.8125rem] text-neutral-500">
              {recipe.cook_time} min cook
            </span>
          )}

          {/* Unit toggle */}
          <div
            role="group"
            aria-label="Unit system"
            className="inline-flex rounded-full border border-brand-200 bg-brand-100 p-0.5 ml-auto"
          >
            <button
              onClick={() => setUnit('imperial')}
              aria-pressed={unit === 'imperial'}
              className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
                unit === 'imperial'
                  ? 'bg-white shadow-sm font-semibold text-neutral-900'
                  : 'font-normal text-neutral-500'
              }`}
            >
              Imperial
            </button>
            <button
              onClick={() => setUnit('metric')}
              aria-pressed={unit === 'metric'}
              className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
                unit === 'metric'
                  ? 'bg-white shadow-sm font-semibold text-neutral-900'
                  : 'font-normal text-neutral-500'
              }`}
            >
              Metric
            </button>
          </div>
        </div>

        <hr className="border-brand-200 my-8" />

        {/* Ingredients */}
        {ingredients.length > 0 && (
          <section>
            <h2 className={h2Class}>Ingredients</h2>
            <div>
              {ingredients.map((ingredient, i) => (
                <div
                  key={i}
                  className={`flex items-baseline justify-between py-2.5 border-b border-brand-200 ${
                    ingredient.hard_to_find ? 'bg-warning-50 px-2 -mx-2 rounded' : ''
                  }`}
                >
                  <span className="font-sans font-semibold text-neutral-900 w-20 shrink-0 text-sm">
                    {ingredient.quantity != null ? ingredient.quantity : ''}
                    {ingredient.unit ? ` ${ingredient.unit}` : ''}
                  </span>
                  <div className="flex-1 px-3">
                    <span className="font-sans text-neutral-700 text-sm">{ingredient.name}</span>
                    {!ingredient.hard_to_find && ingredient.substitutions.length > 0 && (
                      <span className="block font-display italic text-sm text-neutral-500 mt-0.5">
                        sub: {ingredient.substitutions.join(' or ')}
                      </span>
                    )}
                  </div>
                  {ingredient.hard_to_find && (
                    <div className="relative group inline-flex ml-2 shrink-0">
                      <span
                        role="img"
                        aria-label={
                          ingredient.substitutions.length > 0
                            ? `Hard to find — substitute: ${ingredient.substitutions.join(' or ')}`
                            : 'Hard to find — no suitable alternative'
                        }
                        className="text-warning-500 text-base cursor-help"
                      >
                        ⚠
                      </span>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-48 bg-neutral-800 text-white text-xs rounded px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-normal text-center">
                        {ingredient.substitutions.length > 0
                          ? ingredient.substitutions.join(' or ')
                          : 'No Suitable Alternative'}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {recipe.instructions && (
          <>
            <hr className="border-brand-200 my-8" />
            <section>
              {structured ? (
                <>
                  {structured.mise_en_place.length > 0 && (
                    <>
                      <h2 className={h2Class}>Before you start</h2>
                      <ul className="mb-8 space-y-2 list-none">
                        {structured.mise_en_place.map((step, i) => (
                          <li key={i} className="flex gap-3 font-sans text-base leading-relaxed text-neutral-700">
                            <span className="text-brand-300 shrink-0">•</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  <h2 className={h2Class}>Instructions</h2>
                  <ol className="space-y-4 list-none">
                    {structured.steps.map((step, i) => (
                      <li key={i} className="flex gap-4 font-sans text-base leading-relaxed text-neutral-700">
                        <span className="font-semibold text-brand-500 shrink-0 min-w-[1.5rem] text-right">{i + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <>
                  <h2 className={h2Class}>Instructions</h2>
                  <p className="font-sans text-base leading-[1.8] text-neutral-700 whitespace-pre-wrap">
                    {recipe.instructions}
                  </p>
                </>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
