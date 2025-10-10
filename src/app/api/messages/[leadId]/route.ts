import { NextResponse } from 'next/server';
import { MessageService } from '@/lib/message-service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    // Fetch real data from the database
    const messages = await MessageService.getMessages(leadId);
    
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error in messages API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}