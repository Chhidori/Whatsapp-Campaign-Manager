import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Create a client specifically for public schema operations (like getting user schema)
const publicSupabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public'
  }
});

export interface UserSchemaInfo {
  userId: string;
  schema_name: string;
}

/**
 * Fetch user's schema from the user_schema table in public schema using auth_user_id
 * Includes retry logic for better reliability
 */
export async function getUserSchema(userId: string, retries: number = 3): Promise<string | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Fetching user schema for user ${userId}, attempt ${attempt}/${retries}`);
      
      // Add a small delay for retries to allow network to stabilize
      if (attempt > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }

      const { data, error } = await publicSupabase
        .from('user_schema')
        .select('schema_name')
        .eq('auth_user_id', userId)
        .single();
      
      if (error) {
        console.error(`Error fetching user schema (attempt ${attempt}):`, error);
        
        // Don't retry for certain types of errors
        if (error.code === 'PGRST116' || error.message?.includes('Row not found')) {
          console.warn(`No schema found for user ${userId}`);
          return null;
        }
        
        // For network errors, continue to retry
        if (attempt === retries) {
          console.error(`Failed to fetch user schema after ${retries} attempts`);
          return null;
        }
        
        continue;
      }

      const schemaName = data?.schema_name;
      if (!schemaName) {
        console.warn(`Empty schema name for user ${userId}`);
        return null;
      }

      console.log(`Successfully fetched schema for user ${userId}: ${schemaName}`);
      return schemaName;
      
    } catch (error) {
      console.error(`Exception fetching user schema (attempt ${attempt}):`, error);
      
      if (attempt === retries) {
        console.error(`Failed to fetch user schema after ${retries} attempts with exception:`, error);
        return null;
      }
    }
  }
  
  return null;
}

/**
 * Set user schema in cookie (client-side) with error handling
 */
export function setUserSchemaCookie(schemaName: string): boolean {
  try {
    if (typeof document !== 'undefined') {
      document.cookie = `user_schema=${schemaName}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`; // 7 days
      console.log(`User schema cookie set: ${schemaName}`);
      return true;
    }
    console.warn('Cannot set cookie: document not available');
    return false;
  } catch (error) {
    console.error('Error setting user schema cookie:', error);
    return false;
  }
}

/**
 * Get user schema from cookie (client-side)
 */
export function getUserSchemaCookie(): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  const schemaCookie = cookies.find(cookie => cookie.trim().startsWith('user_schema='));
  
  return schemaCookie ? schemaCookie.split('=')[1].trim() : null;
}

/**
 * Remove user schema cookie (client-side) with error handling
 */
export function removeUserSchemaCookie(): boolean {
  try {
    if (typeof document !== 'undefined') {
      document.cookie = 'user_schema=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      console.log('User schema cookie removed');
      return true;
    }
    console.warn('Cannot remove cookie: document not available');
    return false;
  } catch (error) {
    console.error('Error removing user schema cookie:', error);
    return false;
  }
}