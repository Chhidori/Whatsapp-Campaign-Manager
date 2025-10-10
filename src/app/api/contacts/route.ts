import { NextResponse } from 'next/server';
import { MessageService } from '@/lib/message-service';

export async function GET() {
  try {
    // Fetch real data from the database
    const contacts = await MessageService.getContacts();
    
    return NextResponse.json(contacts);
  } catch (error) {
    console.error('Error in contacts API:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch contacts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}