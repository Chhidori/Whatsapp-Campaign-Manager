import { NextResponse } from 'next/server';
import { CampaignService } from '@/lib/campaign-service';
import { createSupabaseForApiRoute } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    // Create Supabase client for this API route
    const supabase = createSupabaseForApiRoute(request);
    
    // Fetch campaigns from the database
    const { data, error } = await CampaignService.getCampaigns(supabase);
    
    if (error) {
      console.error('Error fetching campaigns:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch campaigns',
        details: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in campaigns API:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch campaigns',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}