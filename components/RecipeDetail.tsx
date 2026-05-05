'use client'

import { useState } from 'react'
import Link from 'next/link'
import { convertIngredient } from '@/lib/convert'
import type { Recipe } from '@/lib/types'

interface Props {
  recipe: Recipe
}

/**
 * Public recipe detail client component.
 * Holds unit system state and converts ingredients on each render — no server round-trip.
 */
export default function RecipeDetail({ recipe }: Props) {
  const [unit, setUnit] = useState<'imperial' | 'metric'>('imperial')

  const ingredients = (recipe.ingredients ?? []).map((i) => convertIngredient(i, unit))

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
          <div className="inline-flex rounded-full border border-brand-200 bg-brand-100 p-0.5 ml-auto">
            <button
              onClick={() => setUnit('imperial')}
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
            <h2 className="font-display text-[1.375rem] font-semibold leading-snug text-neutral-900 mb-4">
              Ingredients
            </h2>
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
                    {ingredient.substitutions.length > 0 && (
                      <span className="block font-display italic text-sm text-neutral-500 mt-0.5">
                        sub: {ingredient.substitutions.join(' or ')}
                      </span>
                    )}
                  </div>
                  {ingredient.hard_to_find && (
                    <span className="text-warning-500 text-base ml-2 shrink-0" title="Hard to find">
                      ⚠
                    </span>
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
              <h2 className="font-display text-[1.375rem] font-semibold leading-snug text-neutral-900 mb-4">
                Instructions
              </h2>
              <p className="font-sans text-base leading-[1.8] text-neutral-700 whitespace-pre-wrap">
                {recipe.instructions}
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
