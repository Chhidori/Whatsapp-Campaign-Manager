import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// Browser client for authentication and client-side operations
export const createBrowserSupabaseClient = () => {
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    global: {
      headers: {
        'X-Client-Info': 'whatsapp-scheduler'
      }
    }
  })
}

// Export for direct use in components that need authentication
export const browserSupabase = createBrowserSupabaseClient()

export type User = {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
    first_name?: string
    last_name?: string
  }
}