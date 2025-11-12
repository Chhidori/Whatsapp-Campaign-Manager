import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

/**
 * Get user's schema from cookie with validation - NO FALLBACK, must be set from user_schema table
 */
async function getUserSchemaFromCookie(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const userSchema = cookieStore.get('user_schema')?.value
    
    if (!userSchema) {
      console.warn('No user schema found in cookies');
      return null;
    }
    
    // Basic validation of schema name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(userSchema)) {
      console.warn('Invalid schema name format:', userSchema);
      return null;
    }
    
    return userSchema;
  } catch (error) {
    console.error('Error reading user schema from cookie:', error);
    return null;
  }
}

// Server client for database operations and API routes with retry logic
export const createServerSupabaseClient = async () => {
  const userSchema = await getUserSchemaFromCookie()
  
  if (!userSchema) {
    throw new Error('User schema not found. User must be logged in and have a schema assigned.')
  }
  
  const client = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return [] // Will be set by middleware
      },
      setAll(cookiesToSet: Array<{name: string, value: string, options?: Partial<ResponseCookie>}>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Cookie setting will be handled by middleware
            console.log(`Would set cookie: ${name}=${value}`, options)
          })
        } catch (error) {
          console.warn('Error setting cookies in server client:', error)
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
  
  return client
}

// Export for backward compatibility - creates a new server client instance
// Note: This is async now, so you'll need to await it
export const getSupabaseClient = createServerSupabaseClient

/**
 * Get user's schema from API request cookies with validation - NO FALLBACK
 */
function getUserSchemaFromRequest(request: Request): string | null {
  try {
    const cookieHeader = request.headers.get('cookie')
    if (!cookieHeader) {
      console.warn('No cookie header found in request');
      return null;
    }
    
    const cookies = cookieHeader.split(';')
    const schemaCookie = cookies.find(cookie => cookie.trim().startsWith('user_schema='))
    
    if (!schemaCookie) {
      console.warn('No user_schema cookie found in request');
      return null;
    }
    
    const schemaValue = schemaCookie.split('=')[1]?.trim()
    
    if (!schemaValue) {
      console.warn('Empty user_schema cookie value');
      return null;
    }
    
    // Basic validation of schema name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schemaValue)) {
      console.warn('Invalid schema name format in request:', schemaValue);
      return null;
    }
    
    return schemaValue;
  } catch (error) {
    console.error('Error parsing user schema from request cookies:', error);
    return null;
  }
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