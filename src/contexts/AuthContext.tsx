'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { browserSupabase, type User } from '@/lib/supabase-browser';
import { Session } from '@supabase/supabase-js';
import { getUserSchema, setUserSchemaCookie, removeUserSchemaCookie, getUserSchemaCookie } from '@/lib/user-schema';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const maxRetries = 3;
    
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth loading timeout - setting loading to false');
        setLoading(false);
      }
    }, 10000); // 10 second timeout for better network handling

    // Get initial session with retry logic and better error handling
    const initializeAuth = async (attempt: number = 1): Promise<void> => {
      try {
        if (!mounted) return;

        console.log(`Auth initialization attempt ${attempt}/${maxRetries}`);
        
        // Add a small delay for first retry to allow network to stabilize
        if (attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }

        const { data: { session }, error } = await browserSupabase.auth.getSession();
        
        if (!mounted) return;
      
        if (error) {
          // Handle refresh token errors by clearing the session silently
          if (error.message?.includes('Invalid Refresh Token') || 
              error.message?.includes('Refresh Token Not Found') ||
              error.message?.includes('refresh_token')) {
            console.debug('Clearing expired session tokens');
            
            // Clear any stale tokens silently
            try {
              await browserSupabase.auth.signOut();
            } catch (signOutError) {
              console.debug('Sign out error during cleanup:', signOutError);
            }
            
            setSession(null);
            setUser(null);
            removeUserSchemaCookie();
            
            if (mounted) {
              clearTimeout(loadingTimeout);
              setLoading(false);
            }
            return;
          } 
          
          // For network errors or temporary issues, retry
          if ((error.message?.includes('network') || 
               error.message?.includes('fetch') ||
               error.message?.includes('timeout')) && 
              attempt < maxRetries) {
            console.warn(`Auth initialization failed on attempt ${attempt}, retrying...`, error.message);
            return initializeAuth(attempt + 1);
          }
          
          // For other errors, log and continue
          console.error('Session error:', error);
          if (mounted) {
            clearTimeout(loadingTimeout);
            setLoading(false);
          }
          return;
        }
        
        // Successfully got session
        setSession(session);
        setUser(session?.user ?? null);
        
        // If user is logged in, handle schema cookie with retry logic
        if (session?.user?.email) {
          try {
            const currentSchema = getUserSchemaCookie();
            
            if (!currentSchema) {
              console.log('No schema cookie found, fetching user schema...');
              const userSchema = await getUserSchema(session.user.id);
              
              if (userSchema) {
                setUserSchemaCookie(userSchema);
                console.log('User schema set:', userSchema);
              } else {
                console.warn('No schema assigned to user:', session.user.email);
                // Don't auto sign out here - let middleware handle it
                // This prevents immediate logout on legitimate users
              }
            } else {
              console.log('User schema already set:', currentSchema);
            }
          } catch (schemaError) {
            console.error('Error handling user schema:', schemaError);
            // Don't block login for schema errors - they might be temporary
          }
        }
        
        if (mounted) {
          clearTimeout(loadingTimeout);
          setLoading(false);
        }
        
      } catch (error) {
        if (!mounted) return;
        
        console.error(`Auth initialization error on attempt ${attempt}:`, error);
        
        // Retry for network-related errors
        if (attempt < maxRetries) {
          console.log(`Retrying auth initialization (${attempt + 1}/${maxRetries})...`);
          return initializeAuth(attempt + 1);
        }
        
        // Final failure
        console.error('Auth initialization failed after all retries');
        clearTimeout(loadingTimeout);
        setLoading(false);
      }
    };

    // Initialize authentication with retry logic
    initializeAuth(1);

    // Listen for auth changes
    const {
      data: { subscription },
    } = browserSupabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      // Handle TOKEN_REFRESHED errors
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.warn('Token refresh failed, clearing session');
        setSession(null);
        setUser(null);
        removeUserSchemaCookie();
        if (mounted) {
          setLoading(false);
        }
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      
      try {
        // Handle schema cookie on auth state changes
        if (session?.user?.id) {
          const userSchema = await getUserSchema(session.user.id);
          if (userSchema) {
            setUserSchemaCookie(userSchema);
          } else {
            console.warn('No schema assigned to user:', session.user.email);
            // Don't auto-signout on schema errors during auth changes
          }
        } else {
          // User signed out, remove schema cookie
          removeUserSchemaCookie();
        }
      } catch (error) {
        // Handle refresh token errors in schema operations
        if (error instanceof Error && error.message?.includes('refresh_token')) {
          console.warn('Refresh token error in auth state change, signing out');
          await browserSupabase.auth.signOut();
          setSession(null);
          setUser(null);
          removeUserSchemaCookie();
        } else {
          console.error('Error in auth state change handler:', error);
        }
      }
      
      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error, data } = await browserSupabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return { error };
      }

      // After successful authentication, get user's schema and set cookie
      if (data.user?.id) {
        const userSchema = await getUserSchema(data.user.id);
        if (userSchema) {
          setUserSchemaCookie(userSchema);
        } else {
          // If no schema found, sign out the user
          await browserSupabase.auth.signOut();
          return { error: new Error('No schema assigned to this user. Please contact administrator.') };
        }
      }
      
      return { error: null };
    } catch (authError) {
      return { error: authError instanceof Error ? authError : new Error('Authentication failed') };
    }
  };

  const signOut = async () => {
    try {
      // Remove schema cookie first
      removeUserSchemaCookie();
      
      // Clear local state immediately
      setUser(null);
      setSession(null);
      
      // Then sign out from Supabase
      const { error } = await browserSupabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
      }
      
      // Force redirect to login
      window.location.href = '/login';
    } catch (error) {
      console.error('Error during sign out:', error);
      // Force redirect even on error
      window.location.href = '/login';
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}