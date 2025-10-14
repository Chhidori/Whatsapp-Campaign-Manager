import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseForApiRoute } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createSupabaseForApiRoute(request);
    const { auto_reply } = await request.json();
    const { id: campaignId } = await params;

    // Validate input
    if (typeof auto_reply !== 'boolean') {
      return NextResponse.json(
        { error: 'auto_reply must be a boolean value' },
        { status: 400 }
      );
    }

    // Update the campaign's auto_reply field
    const { data: campaign, error } = await supabase
      .from('wa_campaigns')
      .update({ 
        auto_reply,
        updated_date: new Date().toISOString()
      })
      .eq('id', campaignId)
      .select()
      .single();

    if (error) {
      console.error('Error updating campaign auto reply:', error);
      return NextResponse.json(
        { error: 'Failed to update auto reply setting', details: error.message },
        { status: 500 }
      );
    }

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: campaign
    });

  } catch (error) {
    console.error('Unexpected error in PATCH /api/campaigns/[id]/auto-reply:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}