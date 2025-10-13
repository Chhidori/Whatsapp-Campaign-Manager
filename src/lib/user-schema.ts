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
  username: string;
  schema_name: string;
}

/**
 * Fetch user's schema from the user_schema table in public schema
 */
export async function getUserSchema(username: string): Promise<string | null> {
  try {
    const { data, error } = await publicSupabase
      .from('user_schema')
      .select('schema_name')
      .eq('username', username)
      .single();

    if (error) {
      console.error('Error fetching user schema:', error);
      return null;
    }

    return data?.schema_name || null;
  } catch (error) {
    console.error('Exception fetching user schema:', error);
    return null;
  }
}

/**
 * Set user schema in cookie (client-side)
 */
export function setUserSchemaCookie(schemaName: string): void {
  if (typeof document !== 'undefined') {
    document.cookie = `user_schema=${schemaName}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`; // 7 days
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
 * Remove user schema cookie (client-side)
 */
export function removeUserSchemaCookie(): void {
  if (typeof document !== 'undefined') {
    document.cookie = 'user_schema=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
}