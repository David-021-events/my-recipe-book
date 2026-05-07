import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const client = new Anthropic()

const PROMPT = `You are a recipe parser. Extract the following from the input and return ONLY valid JSON — no explanation, no markdown.

Return this structure:
{
  "title": string,
  "servings": number,
  "prep_time": number | null,
  "cook_time": number | null,
  "ingredients": [
    {
      "name": string,
      "quantity": number | null,
      "unit": string | null,
      "hard_to_find": boolean,
      "substitutions": string[]
    }
  ],
  "instructions": {
    "mise_en_place": [string],
    "steps": [string]
  }
}

Rules:
- Return ONLY JSON. No markdown, no code fences, no explanation.
- prep_time: total preparation time in minutes (chopping, measuring, etc.). null if not stated.
- cook_time: total active cooking or baking time in minutes. null if not stated.
- hard_to_find is true only for ingredients unlikely to be in a standard Western pantry.
- substitutions: max 2 common alternatives, only populate if hard_to_find is true.
- unit must be one of: tsp, tbsp, cup, oz, lb, ml, g, kg, clove, pinch, count.
- Use "count" for items measured by whole number (eggs, onions, garlic cloves).
- Map all unit variants to the list above (e.g. tablespoon / T / Tbs → tbsp).
- If quantity or unit cannot be determined, use null.
- instructions.mise_en_place: preparation steps only (pre-heat, measure, dice, soak). Empty array if none.
- instructions.steps: cooking steps in order. Each step is one complete action. Do NOT include step numbers in the text.`

const RecipeExtractedSchema = z.object({
  title: z.string(),
  servings: z.number(),
  prep_time: z.number().nullable().optional(),
  cook_time: z.number().nullable().optional(),
  ingredients: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().nullable(),
      unit: z
        .enum(['tsp', 'tbsp', 'cup', 'oz', 'lb', 'ml', 'g', 'kg', 'clove', 'pinch', 'count'])
        .nullable(),
      hard_to_find: z.boolean(),
      substitutions: z.array(z.string()).max(2),
    })
  ),
  instructions: z
    .object({
      mise_en_place: z.array(z.string()),
      steps: z.array(z.string()),
    })
    .transform((v) => JSON.stringify(v)),
})

/** The validated, structured recipe data produced by the Claude extraction pipeline. */
export type RecipeExtracted = z.infer<typeof RecipeExtractedSchema>

/** Discriminated union of inputs accepted by {@link extractRecipe}: plain text, base64 image, or URL. */
export type ExtractionInput =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mediaType: 'image/jpeg' | 'image/png' }
  | { type: 'url'; url: string }

/**
 * Discriminated union returned by {@link extractRecipe}.
 * - `success: true` — structured recipe was extracted and validated. `image_url` is set when a URL was pasted and the page had an `og:image` tag.
 * - `success: false, fallback: true` — Claude responded but JSON was invalid; raw text is preserved.
 * - `success: false, error: 'url_fetch_failed'` — the provided URL could not be fetched.
 */
export type ExtractionResult =
  | { success: true; recipe: RecipeExtracted; image_url?: string | null }
  | { success: false; fallback: true; rawText: string }
  | { success: false; fallback?: false; error: 'url_fetch_failed' }

function buildMessages(input: ExtractionInput & { type: 'text' | 'image' }): Anthropic.MessageParam[] {
  if (input.type === 'image') {
    return [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: input.mediaType, data: input.data },
          },
          { type: 'text', text: PROMPT },
        ],
      },
    ]
  }
  return [{ role: 'user', content: `${PROMPT}\n\n${input.text}` }]
}

async function callClaude(input: ExtractionInput & { type: 'text' | 'image' }): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: buildMessages(input),
  })
  const block = message.content[0]
  return block.type === 'text' ? block.text : ''
}

function parseAndValidate(raw: string): RecipeExtracted | null {
  try {
    // Claude sometimes wraps JSON in markdown code fences despite instructions
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    const parsed = JSON.parse(clean)
    const result = RecipeExtractedSchema.safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

/**
 * Extracts structured recipe data from text, an image, or a URL using Claude.
 * Retries once on JSON parse failure before falling back to raw text.
 * @param input - The extraction input: text, base64 image, or URL.
 * @returns A typed result: success with recipe, fallback with raw text, or url_fetch_failed.
 */
export async function extractRecipe(input: ExtractionInput): Promise<ExtractionResult> {
  let resolvedInput: ExtractionInput & { type: 'text' | 'image' }

  let extractedImageUrl: string | null = null

  if (input.type === 'url') {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10_000)
      const res = await fetch(input.url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RecipeBot/1.0)' },
      })
      clearTimeout(timeout)
      if (!res.ok) return { success: false, error: 'url_fetch_failed' }
      const html = await res.text()
      const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
        ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
      extractedImageUrl = ogMatch?.[1] ?? null
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 15_000)
      resolvedInput = { type: 'text', text }
    } catch {
      return { success: false, error: 'url_fetch_failed' }
    }
  } else {
    resolvedInput = input
  }

  const firstResponse = await callClaude(resolvedInput)
  const firstResult = parseAndValidate(firstResponse)
  if (firstResult) return { success: true, recipe: firstResult, image_url: extractedImageUrl }

  // Retry once
  const secondResponse = await callClaude(resolvedInput)
  const secondResult = parseAndValidate(secondResponse)
  if (secondResult) return { success: true, recipe: secondResult, image_url: extractedImageUrl }

  return { success: false, fallback: true, rawText: secondResponse }
}
