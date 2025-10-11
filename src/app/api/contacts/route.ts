import { NextResponse } from 'next/server';
import { MessageService } from '@/lib/message-service';

export async function GET(request: Request) {
  try {
    // Get pagination parameters from URL
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Fetch paginated data from the database
    const result = await MessageService.getContacts(page, limit);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in contacts API:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch contacts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}