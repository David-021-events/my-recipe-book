import { describe, it, expect } from 'vitest'
import { IngredientSchema, RecipeInputSchema } from './schemas'

describe('IngredientSchema', () => {
  it('accepts a valid ingredient', () => {
    const result = IngredientSchema.safeParse({
      name: 'flour',
      quantity: 2,
      unit: 'cup',
      hard_to_find: false,
      substitutions: [],
    })
    expect(result.success).toBe(true)
  })

  it('accepts null quantity and unit', () => {
    const result = IngredientSchema.safeParse({
      name: 'salt',
      quantity: null,
      unit: null,
      hard_to_find: false,
      substitutions: [],
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid unit', () => {
    const result = IngredientSchema.safeParse({
      name: 'flour',
      quantity: 2,
      unit: 'tablespoon', // not in enum
      hard_to_find: false,
      substitutions: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects more than 2 substitutions', () => {
    const result = IngredientSchema.safeParse({
      name: 'tamarind',
      quantity: 1,
      unit: 'tbsp',
      hard_to_find: true,
      substitutions: ['lime juice', 'rice vinegar', 'lemon juice'],
    })
    expect(result.success).toBe(false)
  })
})

describe('RecipeInputSchema', () => {
  const validRecipe = {
    title: 'Pasta',
    servings: 4,
    instructions: 'Boil water.',
    ingredients: [],
    raw_input: null,
    status: 'draft' as const,
  }

  it('accepts a valid recipe body', () => {
    expect(RecipeInputSchema.safeParse(validRecipe).success).toBe(true)
  })

  it('rejects a missing title', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { title: _title, ...noTitle } = validRecipe
    expect(RecipeInputSchema.safeParse(noTitle).success).toBe(false)
  })

  it('rejects an empty title', () => {
    expect(RecipeInputSchema.safeParse({ ...validRecipe, title: '' }).success).toBe(false)
  })

  it('rejects an invalid status', () => {
    expect(RecipeInputSchema.safeParse({ ...validRecipe, status: 'archived' }).success).toBe(false)
  })

  it('defaults servings to 4 when omitted', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { servings: _servings, ...noServings } = validRecipe
    const result = RecipeInputSchema.safeParse(noServings)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.servings).toBe(4)
  })
})
