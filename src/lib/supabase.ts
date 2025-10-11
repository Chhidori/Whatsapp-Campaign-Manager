import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'
const supabaseSchema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || 'public'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: supabaseSchema
  }
})

// Export schema name for use in services
export const SUPABASE_SCHEMA = supabaseSchema

export type User = {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
    first_name?: string
    last_name?: string
  }
}