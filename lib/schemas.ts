import { z } from 'zod'

/** Zod schema for validating a single recipe ingredient at API boundaries. */
export const IngredientSchema = z.object({
  name: z.string(),
  quantity: z.number().nullable(),
  unit: z.enum(['tsp', 'tbsp', 'cup', 'oz', 'lb', 'ml', 'g', 'kg', 'clove', 'pinch', 'count']).nullable(),
  hard_to_find: z.boolean(),
  substitutions: z.array(z.string()).max(2),
})

/** Zod schema for validating recipe creation and update request bodies at API boundaries. */
export const RecipeInputSchema = z.object({
  title: z.string().min(1),
  servings: z.number().int().positive().default(4),
  instructions: z.string().nullable(),
  ingredients: z.array(IngredientSchema).nullable(),
  raw_input: z.string().nullable(),
  status: z.enum(['draft', 'published']).default('draft'),
  image_url: z.string().nullable().optional(),
  prep_time: z.number().int().positive().nullable().optional(),
  cook_time: z.number().int().positive().nullable().optional(),
})
