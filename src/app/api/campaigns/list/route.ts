import { NextResponse } from 'next/server';
import { CampaignService } from '@/lib/campaign-service';
import { createSupabaseForApiRoute } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    // Create Supabase client for this API route
    const supabase = createSupabaseForApiRoute(request);
    
    // Parse query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    // Fetch campaigns from the database with pagination
    const { data, total, error } = await CampaignService.getCampaignsPaginated(supabase, page, limit);
    
    if (error) {
      console.error('Error fetching campaigns:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch campaigns',
        details: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil((total || 0) / limit)
    });
  } catch (error) {
    console.error('Error in campaigns API:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch campaigns',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}