import { createClient } from '@supabase/supabase-js'

/** Public Supabase client — uses the anon key and respects Row Level Security. Safe to use in the browser. */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/** Admin Supabase client — uses the service role key and bypasses Row Level Security. Server-side only; never expose to the browser. */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
