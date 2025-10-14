import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseForApiRoute } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseForApiRoute(request);

    console.log('Creating wa_prompts table...');

    // Create the wa_prompts table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS wa_prompts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        gpt_model VARCHAR(50) NOT NULL DEFAULT 'gpt-4.1',
        prompt_message TEXT NOT NULL,
        created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT valid_gpt_model CHECK (gpt_model IN ('gpt-4.1'))
      );
    `;

    const { data, error } = await supabase.rpc('exec_sql', { query: createTableQuery });

    if (error) {
      console.error('Error creating wa_prompts table:', error);
      
      // Try alternative approach using direct SQL execution
      try {
        const { data: altData, error: altError } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_name', 'wa_prompts')
          .eq('table_schema', 'public');

        if (altError) {
          console.error('Error checking table existence:', altError);
        }

        // If table doesn't exist and we can't create it with RPC, return instructions
        return NextResponse.json({
          success: false,
          error: 'Cannot create table automatically',
          details: error.message,
          instructions: 'Please create the wa_prompts table manually using the SQL below:',
          sql: createTableQuery
        }, { status: 500 });

      } catch (checkError) {
        console.error('Error in fallback table check:', checkError);
      }
    }

    console.log('Table creation result:', { data, error });

    // Verify the table was created
    const { data: verifyData, error: verifyError } = await supabase
      .from('wa_prompts')
      .select('count')
      .limit(1);

    if (verifyError) {
      return NextResponse.json({
        success: false,
        error: 'Table creation verification failed',
        details: verifyError.message,
        sql: createTableQuery
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'wa_prompts table created successfully',
      data: data,
      verification: verifyData
    });

  } catch (error) {
    console.error('Unexpected error creating prompts table:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
        sql: `
          CREATE TABLE IF NOT EXISTS wa_prompts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            gpt_model VARCHAR(50) NOT NULL DEFAULT 'gpt-4.1',
            prompt_message TEXT NOT NULL,
            created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            CONSTRAINT valid_gpt_model CHECK (gpt_model IN ('gpt-4.1'))
          );
        `
      },
      { status: 500 }
    );
  }
}