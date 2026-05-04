/** Measurement units supported for recipe ingredients. */
export type Unit = 'tsp' | 'tbsp' | 'cup' | 'oz' | 'lb' | 'ml' | 'g' | 'kg' | 'clove' | 'pinch' | 'count'

/** Publication lifecycle state of a recipe. */
export type RecipeStatus = 'draft' | 'published'

/** A single ingredient in a recipe, stored as JSONB in the database. */
export interface Ingredient {
  name: string
  quantity: number | null
  unit: Unit | null
  hard_to_find: boolean
  substitutions: string[]
}

/** A recipe record as stored in and returned from the database. */
export interface Recipe {
  id: string
  title: string
  raw_input: string | null
  instructions: string | null
  ingredients: Ingredient[] | null
  servings: number
  status: RecipeStatus
  image_url: string | null
  prep_time: number | null
  cook_time: number | null
  created_at: string
  updated_at: string
}
