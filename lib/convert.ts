import type { Ingredient, Unit } from './types'

type UnitSystem = 'imperial' | 'metric'

/** Conversion map: imperial → metric factors and target units. */
const TO_METRIC: Partial<Record<Unit, { factor: number; unit: Unit }>> = {
  tsp:  { factor: 5,   unit: 'ml' },
  tbsp: { factor: 15,  unit: 'ml' },
  cup:  { factor: 240, unit: 'ml' },
  oz:   { factor: 28,  unit: 'g'  },
  lb:   { factor: 454, unit: 'g'  },
}

/** Conversion map: metric → imperial factors and target units. */
const TO_IMPERIAL: Partial<Record<Unit, { factor: number; unit: Unit }>> = {
  ml: { factor: 1 / 5,   unit: 'tsp' },
  g:  { factor: 1 / 28,  unit: 'oz'  },
  kg: { factor: 1 / 0.454, unit: 'lb' },
}

function round(value: number, unit: Unit): number {
  if (unit === 'ml' || unit === 'g') return Math.round(value)
  return Math.round(value * 10) / 10
}

/**
 * Converts an ingredient's quantity and unit to the target unit system.
 * Returns the ingredient unchanged if its unit is not in the conversion map
 * or if it has no quantity.
 * @param ingredient - The ingredient to convert.
 * @param system - The target unit system: 'imperial' or 'metric'.
 * @returns A new ingredient object with converted quantity and unit.
 */
export function convertIngredient(ingredient: Ingredient, system: UnitSystem): Ingredient {
  if (ingredient.quantity == null || ingredient.unit == null) return ingredient

  const map = system === 'metric' ? TO_METRIC : TO_IMPERIAL
  const conversion = map[ingredient.unit]
  if (!conversion) return ingredient

  return {
    ...ingredient,
    quantity: round(ingredient.quantity * conversion.factor, conversion.unit),
    unit: conversion.unit,
  }
}
