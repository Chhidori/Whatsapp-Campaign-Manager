import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseForApiRoute } from '@/lib/supabase';
import { getUserSchemaFromServerCookies } from '@/lib/server-user-schema';

export async function POST(request: NextRequest) {
  try {
    console.log('=== CAMPAIGN CREATION STARTED ===');
    
    // Create Supabase client for this API route
    let supabase;
    let authUserId;
    
    try {
      supabase = createSupabaseForApiRoute(request);
      
      // Get the authenticated user's session to extract user ID
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('Authentication error:', authError);
        return NextResponse.json({
          error: 'User not authenticated',
          details: authError?.message || 'No user session found',
          hint: 'Please ensure you are logged in and try again'
        }, { status: 401 });
      }
      
      authUserId = user.id;
      console.log('Authenticated user ID for webhook:', authUserId);
    } catch (schemaError) {
      console.error('Schema/Auth error:', schemaError);
      
      // If schema error, try to get user from browser supabase without schema
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      
      // Try getting auth token from Authorization header
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({
          error: 'User not authenticated',
          details: 'No authorization token found. Please log in again.',
          hint: 'Authentication token missing from request'
        }, { status: 401 });
      }
      
      const token = authHeader.replace('Bearer ', '');
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('Token validation error:', authError);
        return NextResponse.json({
          error: 'User not authenticated',
          details: authError?.message || 'Invalid authentication token',
          hint: 'Please log in again'
        }, { status: 401 });
      }
      
      authUserId = user.id;
      console.log('Authenticated user ID from token:', authUserId);
    }
    
    const body = await request.json();
    console.log('Request body received:', JSON.stringify(body, null, 2));
    
    const { name, description, template_name, template_id, contacts, scheduled_at, prompt_id, auto_reply } = body;
    console.log('Extracted data:', { name, description, template_name, template_id, scheduled_at, prompt_id, auto_reply, contactCount: contacts?.length });

    // Step 1: Insert campaign into database
    const campaignInsertData = {
      name,
      description,
      template_name,
      status: 'draft', // Changed from 'active' to 'draft' to match database constraint
      created_date: new Date().toISOString(),
      ...(scheduled_at && { scheduled_at }), // Only include scheduled_at if provided
      ...(prompt_id && prompt_id !== '' && { prompt_id }), // Only include prompt_id if provided and not empty
      auto_reply: auto_reply || false // Default to false if not provided
    };
    
    console.log('Inserting campaign with data:', campaignInsertData);
    
    // First, let's check if the wa_campaigns table exists and what columns it has
    console.log('Checking wa_campaigns table schema...');
    try {
      const { data: existingCampaigns, error: checkError } = await supabase
        .from('wa_campaigns')
        .select('*')
        .limit(1);
        
      console.log('Table check result:', { existingCampaigns, checkError });
      
      if (checkError) {
        console.error('Table check error:', checkError);
      }
    } catch (schemaError) {
      console.error('Schema check error:', schemaError);
    }
    
    const { data: campaign, error: campaignError } = await supabase
      .from('wa_campaigns')
      .insert(campaignInsertData)
      .select()
      .single();

    if (campaignError) {
      console.error('=== CAMPAIGN CREATION ERROR ===');
      console.error('Error details:', JSON.stringify(campaignError, null, 2));
      console.error('Error code:', campaignError.code);
      console.error('Error message:', campaignError.message);
      console.error('Error hint:', campaignError.hint);
      console.error('Error details:', campaignError.details);
      
      return NextResponse.json(
        { 
          error: 'Failed to create campaign', 
          details: campaignError.message,
          code: campaignError.code,
          hint: campaignError.hint,
          supabaseError: campaignError
        },
        { status: 500 }
      );
    }

    console.log('Campaign created successfully:', campaign);
    const campaignId = campaign.id;
    console.log('Campaign ID:', campaignId);

    // Step 1.5: Insert contacts into wa_contacts table with auto-generated lead_ids
    console.log('=== INSERTING CONTACTS ===');
    
    const contactsWithLeadIds = contacts.map((contact: { 
      name?: string; 
      phone_number?: string; 
      phone?: string; 
      Phone?: string; 
      lead_id?: string;
      custom_fields?: Record<string, string>;
    }) => {
      // Auto-generate lead_id if not provided
      const leadId = contact.lead_id || `LEAD_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      
      return {
        name: contact.name || '',
        lead_id: leadId,
        phone_number: contact.phone_number || contact.phone || contact.Phone || '',
        custom_fields: contact.custom_fields || {},
        lead_status: 'new'
        // Removed campaign_id and created_date as they don't exist in wa_contacts table
      };
    });

    console.log('Contacts to insert:', JSON.stringify(contactsWithLeadIds, null, 2));

    const { data: insertedContacts, error: contactsError } = await supabase
      .from('wa_contacts')
      .insert(contactsWithLeadIds)
      .select();

    if (contactsError) {
      console.error('=== CONTACTS INSERTION ERROR ===');
      console.error('Contacts error details:', JSON.stringify(contactsError, null, 2));
      console.error('Contacts error code:', contactsError.code);
      console.error('Contacts error message:', contactsError.message);
      
      // Campaign was created but contacts failed to insert
      return NextResponse.json({
        success: false,
        error: 'Campaign created but failed to insert contacts',
        campaign,
        contactsError: contactsError.message
      }, { status: 500 });
    }

    console.log('Contacts inserted successfully:', insertedContacts);

    // Step 2: Make webhook request to n8n using the contacts with generated lead_ids
    const webhookUrl = process.env.WEBHOOK_ENDPOINT;
    
    if (!webhookUrl) {
      console.error('WEBHOOK_ENDPOINT environment variable is not set');
      return NextResponse.json({
        success: true,
        campaign,
        webhookError: 'Webhook URL not configured but campaign was created'
      });
    }
    
    // Get user schema for the webhook request
    const userSchema = await getUserSchemaFromServerCookies();
    console.log('User schema for webhook:', userSchema);
    
    // Use the contactsWithLeadIds (which have auto-generated lead_ids) for webhook
    const webhookPayload = contactsWithLeadIds.map((contact: { name: string; lead_id: string; phone_number: string }) => ({
      name: contact.name,
      Phone: contact.phone_number,
      campaign_id: campaignId,
      template_name,
      lead_id: contact.lead_id,
      template_id: template_id || '',
      schema_name: userSchema,
      auth_user_id: authUserId
    }));

    console.log('Sending webhook request to:', webhookUrl);
    console.log('Webhook payload:', webhookPayload);

    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      });

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        console.error('Webhook failed:', errorText);
        // Campaign was created but webhook failed
        return NextResponse.json({
          success: true,
          campaign,
          webhookError: 'Webhook request failed but campaign was created'
        });
      }

      const webhookResult = await webhookResponse.json();
      console.log('Webhook success:', webhookResult);

      return NextResponse.json({
        success: true,
        campaign,
        webhookResult
      });

    } catch (webhookError) {
      console.error('Webhook request error:', webhookError);
      return NextResponse.json({
        success: true,
        campaign,
        webhookError: 'Failed to send webhook request but campaign was created'
      });
    }

  } catch (error) {
    console.error('=== UNEXPECTED ERROR IN CAMPAIGN CREATION ===');
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Full error object:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create campaign',
        message: error instanceof Error ? error.message : String(error),
        type: typeof error,
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}