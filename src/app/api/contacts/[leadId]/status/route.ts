import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseForApiRoute } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;
    const { lead_status } = await request.json();

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    if (!lead_status) {
      return NextResponse.json({ error: 'Lead status is required' }, { status: 400 });
    }

    const supabase = createSupabaseForApiRoute(request);

    // Update the lead_status for the specific contact
    const { data, error } = await supabase
      .from('wa_contacts')
      .update({ lead_status })
      .eq('lead_id', leadId)
      .select()
      .single();

    if (error) {
      console.error('Error updating lead status:', error);
      return NextResponse.json({ 
        error: 'Failed to update lead status',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Lead status updated successfully',
      data
    });

  } catch (error) {
    console.error('Error in contacts status API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}