import { supabaseAdmin } from '@/lib/supabase'

/**
 * Uploads a base64-encoded JPEG to the recipe-images bucket and returns the public URL.
 * Overwrites any existing image for the same recipe ID.
 */
export async function uploadRecipeImage(recipeId: string, base64: string): Promise<string> {
  const buffer = Buffer.from(base64, 'base64')
  const { error } = await supabaseAdmin.storage
    .from('recipe-images')
    .upload(`${recipeId}.jpg`, buffer, { upsert: true, contentType: 'image/jpeg' })
  if (error) throw error
  const { data } = supabaseAdmin.storage.from('recipe-images').getPublicUrl(`${recipeId}.jpg`)
  return data.publicUrl
}

/**
 * Removes the image for a recipe from storage. No-op if the file does not exist.
 */
export async function deleteRecipeImage(recipeId: string): Promise<void> {
  await supabaseAdmin.storage.from('recipe-images').remove([`${recipeId}.jpg`])
}
