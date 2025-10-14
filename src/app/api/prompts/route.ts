import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseForApiRoute } from '@/lib/supabase';

// GET - List all prompts
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseForApiRoute(request);

    const { data: prompts, error } = await supabase
      .from('wa_prompts')
      .select('id, name, gpt_model, prompt_message, created_date, updated_date')
      .order('created_date', { ascending: false })
      .limit(100); // Limit results for better performance

    if (error) {
      console.error('Error fetching prompts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch prompts', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: prompts || []
      },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );

  } catch (error) {
    console.error('Unexpected error in GET /api/prompts:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// POST - Create new prompt
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseForApiRoute(request);
    
    const body = await request.json();
    const { name, gpt_model, prompt_message } = body;

    // Validate required fields - check for actual content without trimming
    if (!name || !gpt_model || prompt_message === undefined || prompt_message === null) {
      return NextResponse.json(
        { error: 'All fields are required: name, gpt_model, prompt_message' },
        { status: 400 }
      );
    }

    // Additional validation for empty strings after trimming only name
    if (!name.trim() || !gpt_model || prompt_message.length === 0) {
      return NextResponse.json(
        { error: 'Name and GPT model cannot be empty, and prompt message is required' },
        { status: 400 }
      );
    }

    // Validate GPT model
    const validModels = ['gpt-4.1'];
    if (!validModels.includes(gpt_model)) {
      return NextResponse.json(
        { error: `Invalid GPT model. Allowed values: ${validModels.join(', ')}` },
        { status: 400 }
      );
    }

    const promptData = {
      name: name.trim(),
      gpt_model,
      prompt_message: prompt_message, // Keep exact formatting - no trim()
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString()
    };

    const { data: prompt, error } = await supabase
      .from('wa_prompts')
      .insert(promptData)
      .select()
      .single();

    if (error) {
      console.error('Error creating prompt:', error);
      return NextResponse.json(
        { 
          error: 'Failed to create prompt', 
          details: error.message,
          code: error.code
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: prompt
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/prompts:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}