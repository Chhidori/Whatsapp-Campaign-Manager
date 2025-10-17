import { NextRequest, NextResponse } from 'next/server';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Create a client specifically for public schema operations
const publicSupabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public'
  }
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Query the user_schema table in public schema for custom_settings using auth_user_id
    const { data, error } = await publicSupabase
      .from('user_schema')
      .select('schema_name, custom_settings')
      .eq('auth_user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user custom settings:', error);
      return NextResponse.json({ 
        error: 'Custom settings not found for user',
        details: error.message
      }, { status: 404 });
    }

    // Return custom_settings or empty object as fallback
    return NextResponse.json({ 
      userId,
      schema_name: data.schema_name,
      custom_settings: data.custom_settings || {}
    });
  } catch (error) {
    console.error('Error in user-schema custom-settings API:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch user custom settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}