import { NextResponse } from 'next/server';
import { createSupabaseForApiRoute } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: { leadId: string } }
) {
  try {
    const { leadId } = params;
    
    console.log(`🔍 Checking contact custom_fields for lead_id: ${leadId}`);
    
    // Create Supabase client for this API route
    const supabase = createSupabaseForApiRoute(request);
    
    // Get contact
    const { data: contact, error } = await supabase
      .from('wa_contacts')
      .select('lead_id, name, phone_number, custom_fields')
      .eq('lead_id', leadId)
      .single();

    if (error) {
      console.error('❌ Error fetching contact:', error);
      return NextResponse.json({
        error: 'Contact not found',
        details: error.message
      }, { status: 404 });
    }

    console.log(`✅ Contact found:`, contact);
    
    return NextResponse.json({
      success: true,
      data: {
        lead_id: contact.lead_id,
        name: contact.name,
        phone_number: contact.phone_number,
        custom_fields: contact.custom_fields,
        custom_fields_type: typeof contact.custom_fields,
        custom_fields_keys: contact.custom_fields ? Object.keys(contact.custom_fields) : [],
        custom_fields_count: contact.custom_fields ? Object.keys(contact.custom_fields).length : 0
      }
    });
    
  } catch (error) {
    console.error('❌ Error in verify contact API:', error);
    
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}