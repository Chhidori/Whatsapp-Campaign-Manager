import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

/**
 * Get user's schema from cookie - NO FALLBACK, must be set from user_schema table
 */
async function getUserSchemaFromCookie(): Promise<string | null> {
  const cookieStore = await cookies()
  const userSchema = cookieStore.get('user_schema')?.value
  return userSchema || null
}

// Server client for database operations and API routes
export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies()
  const userSchema = await getUserSchemaFromCookie()
  
  if (!userSchema) {
    throw new Error('User schema not found. User must be logged in and have a schema assigned.')
  }
  
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: Array<{name: string, value: string, options?: Partial<ResponseCookie>}>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
    db: {
      schema: userSchema
    }
  })
}

// Export for backward compatibility - creates a new server client instance
// Note: This is async now, so you'll need to await it
export const getSupabaseClient = createServerSupabaseClient

/**
 * Get user's schema from API request cookies - NO FALLBACK
 */
function getUserSchemaFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return null
  
  const cookies = cookieHeader.split(';')
  const schemaCookie = cookies.find(cookie => cookie.trim().startsWith('user_schema='))
  
  return schemaCookie ? schemaCookie.split('=')[1].trim() : null
}

// For API routes that can handle cookies synchronously
export const createSupabaseForApiRoute = (request: Request) => {
  const userSchema = getUserSchemaFromRequest(request)
  
  if (!userSchema) {
    throw new Error('User schema not found in request. User must be logged in and have a schema assigned.')
  }
  
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookieHeader = request.headers.get('cookie')
        if (!cookieHeader) return []
        
        return cookieHeader.split(';').map(cookie => {
          const [name, value] = cookie.trim().split('=')
          return { name, value }
        })
      },
      setAll(/* cookiesToSet */) {
        // In API routes, you'll need to handle setting cookies in the response
        // This is typically done in the route handler itself
      },
    },
    db: {
      schema: userSchema
    }
  })
}

// No default schema export - all schemas must come from user_schema table