import { NextResponse } from 'next/server';
import { MessageService } from '@/lib/message-service';
import { createSupabaseForApiRoute } from '@/lib/supabase';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;
    const body = await request.json();
    const { messageIds } = body;

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    // Create Supabase client for this API route
    const supabase = createSupabaseForApiRoute(request);

    await MessageService.markMessagesAsRead(supabase, leadId, messageIds);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}