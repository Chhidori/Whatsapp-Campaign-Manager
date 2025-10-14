import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseForApiRoute } from '@/lib/supabase';

// GET - Get a single prompt by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createSupabaseForApiRoute(request);
    const { id: promptId } = await params;

    const { data: prompt, error } = await supabase
      .from('wa_prompts')
      .select('id, name, gpt_model, prompt_message, created_date, updated_date')
      .eq('id', promptId)
      .single();

    if (error) {
      console.error('Error fetching prompt:', error);
      return NextResponse.json(
        { error: 'Failed to fetch prompt', details: error.message },
        { status: 500 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: prompt
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/prompts/[id]:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// PUT - Update a prompt
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createSupabaseForApiRoute(request);
    const { id: promptId } = await params;
    
    const body = await request.json();
    const { name, gpt_model, prompt_message } = body;

    // Validate required fields
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

    const updateData = {
      name: name.trim(),
      gpt_model,
      prompt_message: prompt_message, // Keep exact formatting - no trim()
      updated_date: new Date().toISOString()
    };

    const { data: prompt, error } = await supabase
      .from('wa_prompts')
      .update(updateData)
      .eq('id', promptId)
      .select()
      .single();

    if (error) {
      console.error('Error updating prompt:', error);
      return NextResponse.json(
        { 
          error: 'Failed to update prompt', 
          details: error.message,
          code: error.code
        },
        { status: 500 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: prompt
    });

  } catch (error) {
    console.error('Unexpected error in PUT /api/prompts/[id]:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete a prompt
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createSupabaseForApiRoute(request);
    const { id: promptId } = await params;

    // First check if the prompt exists
    const { data: existingPrompt, error: fetchError } = await supabase
      .from('wa_prompts')
      .select('id')
      .eq('id', promptId)
      .single();

    if (fetchError || !existingPrompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }

    // Delete the prompt
    const { error } = await supabase
      .from('wa_prompts')
      .delete()
      .eq('id', promptId);

    if (error) {
      console.error('Error deleting prompt:', error);
      return NextResponse.json(
        { 
          error: 'Failed to delete prompt', 
          details: error.message,
          code: error.code
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Prompt deleted successfully'
    });

  } catch (error) {
    console.error('Unexpected error in DELETE /api/prompts/[id]:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}