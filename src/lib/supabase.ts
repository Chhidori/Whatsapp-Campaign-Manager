import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'
const supabaseSchema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || 'public'

console.log('🔧 Supabase Configuration Check:');
console.log('📍 SUPABASE_URL:', supabaseUrl);
console.log('🔑 SUPABASE_ANON_KEY:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}...` : 'NOT SET');
console.log('🗂️ SUPABASE_SCHEMA:', supabaseSchema);
console.log('🌍 Environment:', process.env.NODE_ENV);

// Check if we have real Supabase credentials
const hasRealCredentials = supabaseUrl !== 'https://your-project.supabase.co' && supabaseAnonKey !== 'your-anon-key';
console.log('✅ Has real Supabase credentials:', hasRealCredentials);

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