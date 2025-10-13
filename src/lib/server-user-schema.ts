import { cookies } from 'next/headers';

/**
 * Server-side utility to get user schema from cookies - NO FALLBACK
 */
export async function getUserSchemaFromServerCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const userSchema = cookieStore.get('user_schema')?.value;
  
  return userSchema || null;
}

/**
 * Server-side utility to set user schema cookie (for API routes)
 */
export function setUserSchemaCookieHeader(schemaName: string): string {
  return `user_schema=${schemaName}; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax; HttpOnly`;
}