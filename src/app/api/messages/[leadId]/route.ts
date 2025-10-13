import { NextResponse } from 'next/server';
import { MessageService } from '@/lib/message-service';
import { createSupabaseForApiRoute } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    // Create Supabase client for this API route
    const supabase = createSupabaseForApiRoute(request);

    // Fetch real data from the database
    const messages = await MessageService.getMessages(supabase, leadId);
    
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error in messages API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}