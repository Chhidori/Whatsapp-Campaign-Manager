import { NextResponse } from 'next/server';
import { CampaignService } from '@/lib/campaign-service';
import { createSupabaseForApiRoute } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    // Create Supabase client for this API route
    const supabase = createSupabaseForApiRoute(request);
    
    // Test database connection
    const canConnect = await CampaignService.testConnection(supabase);
    
    return NextResponse.json({ canConnect });
  } catch (error) {
    console.error('Error testing database connection:', error);
    return NextResponse.json({ 
      canConnect: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}