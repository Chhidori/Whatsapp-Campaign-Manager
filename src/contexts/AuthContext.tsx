'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { browserSupabase, type User } from '@/lib/supabase-browser';
import { Session } from '@supabase/supabase-js';
import { getUserSchema, setUserSchemaCookie, removeUserSchemaCookie } from '@/lib/user-schema';

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
    // Get initial session
    browserSupabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // If user is logged in but no schema cookie exists, fetch and set it
      if (session?.user?.email) {
        const currentSchema = document.cookie.split(';').find(cookie => 
          cookie.trim().startsWith('user_schema=')
        );
        
        if (!currentSchema) {
          const userSchema = await getUserSchema(session.user.email);
          if (userSchema) {
            setUserSchemaCookie(userSchema);
          } else {
            // If no schema found, sign out the user
            await browserSupabase.auth.signOut();
            console.error('No schema assigned to user:', session.user.email);
          }
        }
      }
      
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = browserSupabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Handle schema cookie on auth state changes
      if (session?.user?.email) {
        const userSchema = await getUserSchema(session.user.email);
        if (userSchema) {
          setUserSchemaCookie(userSchema);
        } else {
          // If no schema found, sign out the user
          await browserSupabase.auth.signOut();
          console.error('No schema assigned to user:', session.user.email);
        }
      } else {
        // User signed out, remove schema cookie
        removeUserSchemaCookie();
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
      if (data.user?.email) {
        const userSchema = await getUserSchema(data.user.email);
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
    await browserSupabase.auth.signOut();
    // Remove schema cookie on sign out
    removeUserSchemaCookie();
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