import { createClient, SupabaseClient } from '@supabase/supabase-js'

let instance: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!instance) {
    instance = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    )
  }
  return instance
}
