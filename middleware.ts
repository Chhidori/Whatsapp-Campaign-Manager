import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session and validate user
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  // Handle session refresh or validation errors
  if (sessionError) {
    console.warn('Session error in middleware:', sessionError.message)
    
    // If it's a refresh token error, clear cookies and redirect to login
    if (sessionError.message?.includes('refresh_token') || 
        sessionError.message?.includes('Invalid Refresh Token')) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      
      // Clear all auth-related cookies
      response.cookies.delete('user_schema')
      response.cookies.delete('sb-access-token')
      response.cookies.delete('sb-refresh-token')
      
      return response
    }
  }

  const pathname = request.nextUrl.pathname

  // Public routes that don't need authentication
  const publicRoutes = ['/login']
  const isPublicRoute = publicRoutes.includes(pathname)

  // If no session and trying to access protected route
  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If has session but trying to access login page
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // For authenticated users, ensure user schema is set
  if (session && !isPublicRoute) {
    const userSchemaFromCookie = request.cookies.get('user_schema')?.value
    
    if (!userSchemaFromCookie) {
      try {
        // Fetch user schema from public schema
        const { data: userSchemaData, error: schemaError } = await supabase
          .schema('public')
          .from('user_schema')
          .select('schema_name')
          .eq('auth_user_id', session.user.id)
          .single()

        if (schemaError || !userSchemaData?.schema_name) {
          console.error('User schema not found for user:', session.user.email, schemaError)
          
          // Clear session and redirect to login
          const response = NextResponse.redirect(new URL('/login', request.url))
          response.cookies.delete('user_schema')
          
          // Sign out the user
          await supabase.auth.signOut()
          
          return response
        }

        // Set the user schema cookie
        supabaseResponse.cookies.set('user_schema', userSchemaData.schema_name, {
          path: '/',
          maxAge: 7 * 24 * 60 * 60, // 7 days
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        })
      } catch (error) {
        console.error('Error setting user schema in middleware:', error)
        
        // If there's an error, redirect to login to force re-authentication
        const response = NextResponse.redirect(new URL('/login', request.url))
        response.cookies.delete('user_schema')
        return response
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}