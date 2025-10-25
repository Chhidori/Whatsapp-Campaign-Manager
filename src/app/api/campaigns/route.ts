import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseForApiRoute } from '@/lib/supabase';
import { getUserSchemaFromServerCookies } from '@/lib/server-user-schema';

// Interface for template API response
interface TemplateApiResponse {
  name: string;
  parameter_format?: string;
}

// Interface for parameter mapping
interface ParameterMapping {
  placeholder: string;
  parameter_name: string;
  mapped_field: string;
  type: 'text';
}

// Interface for template parameter value
interface TemplateParamValue {
  type: 'text';
  parameter_name: string;
  text: string;
}

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
    
    const { name, description, template_name, template_id, contacts, scheduled_at, prompt_id, auto_reply, parameter_mappings } = body;
    console.log('Extracted data:', { name, description, template_name, template_id, scheduled_at, prompt_id, auto_reply, parameter_mappings, contactCount: contacts?.length });

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

    // Step 1.5: Insert contacts into wa_contacts table with duplicate handling
    console.log('=== INSERTING CONTACTS WITH DUPLICATE HANDLING ===');
    
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
      };
    });

    console.log('Contacts to process:', JSON.stringify(contactsWithLeadIds, null, 2));

    // Check for existing contacts by phone_number  
    const phoneNumbers = contactsWithLeadIds.map((c: { phone_number: string }) => c.phone_number).filter(Boolean);
    
    const { data: existingContacts, error: checkError } = await supabase
      .from('wa_contacts')
      .select('phone_number, lead_id, name, custom_fields')
      .in('phone_number', phoneNumbers);

    if (checkError) {
      console.error('Error checking existing contacts:', checkError);
      return NextResponse.json({
        success: false,
        error: 'Campaign created but failed to check existing contacts',
        campaign,
        contactsError: checkError.message
      }, { status: 500 });
    }

    console.log('Existing contacts found:', existingContacts);

    // Separate new and existing contacts
    const existingPhones = new Set(existingContacts?.map((c: { phone_number: string }) => c.phone_number) || []);
    const newContacts = contactsWithLeadIds.filter((c: { phone_number: string }) => !existingPhones.has(c.phone_number));
    const existingContactsForWebhook = existingContacts || [];

    console.log(`Found ${newContacts.length} new contacts and ${existingContactsForWebhook.length} existing contacts`);

    let insertedContacts: { name: string; lead_id: string; phone_number: string; custom_fields: Record<string, string> }[] = [];

    // Insert only new contacts
    if (newContacts.length > 0) {
      const { data: newInsertedContacts, error: contactsError } = await supabase
        .from('wa_contacts')
        .insert(newContacts)
        .select();

      if (contactsError) {
        console.error('=== NEW CONTACTS INSERTION ERROR ===');
        console.error('Contacts error details:', JSON.stringify(contactsError, null, 2));
        
        return NextResponse.json({
          success: false,
          error: 'Campaign created but failed to insert new contacts',
          campaign,
          contactsError: contactsError.message
        }, { status: 500 });
      }

      insertedContacts = newInsertedContacts || [];
      console.log('New contacts inserted successfully:', insertedContacts);
    }

    // Combine all contacts for webhook (new + existing)
    const allContactsForWebhook = [
      ...insertedContacts,
      ...existingContactsForWebhook
    ];

    console.log('Total contacts for webhook:', allContactsForWebhook.length);

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
    
    // Get template information to include template_type
    let templateType = '';
    try {
      // Fetch template information to get parameter_format
      const templatesResponse = await fetch(process.env.NEXT_PUBLIC_WEBHOOK_URL || 'https://n8n.funbook.org.in/webhook/templates');
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        const templateData = templatesData.data?.find((t: TemplateApiResponse) => t.name === template_name);
        if (templateData && templateData.parameter_format) {
          templateType = templateData.parameter_format.toLowerCase();
        }
      }
    } catch (error) {
      console.error('Error fetching template information:', error);
    }

    // Function to generate template parameters for a contact
    const generateTemplateParams = (contact: { name: string; phone_number: string; custom_fields?: Record<string, string> }, mappings: ParameterMapping[]): TemplateParamValue[] => {
      if (!mappings || mappings.length === 0) {
        return [];
      }

      return mappings.map(mapping => {
        let value = '';
        
        // Get value based on mapped field
        if (mapping.mapped_field === 'name') {
          value = contact.name || '';
        } else if (mapping.mapped_field === 'phone_number') {
          value = contact.phone_number || '';
        } else if (contact.custom_fields && contact.custom_fields[mapping.mapped_field]) {
          value = contact.custom_fields[mapping.mapped_field];
        }
        
        return {
          type: 'text' as const,
          parameter_name: mapping.parameter_name,
          text: value
        };
      });
    };

    // Use allContactsForWebhook (both new and existing contacts) for webhook
    const webhookPayload = allContactsForWebhook.map((contact: { 
      name: string; 
      lead_id: string; 
      phone_number: string;
      custom_fields?: Record<string, string>;
    }) => ({
      name: contact.name,
      Phone: contact.phone_number,
      campaign_id: campaignId,
      template_name,
      lead_id: contact.lead_id,
      template_id: template_id || '',
      template_type: templateType,
      template_params: generateTemplateParams(contact, parameter_mappings || []),
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
        webhookResult,
        contactStats: {
          total: allContactsForWebhook.length,
          new: insertedContacts.length,
          existing: existingContactsForWebhook.length
        }
      });

    } catch (webhookError) {
      console.error('Webhook request error:', webhookError);
      return NextResponse.json({
        success: true,
        campaign,
        webhookError: 'Failed to send webhook request but campaign was created',
        contactStats: {
          total: allContactsForWebhook.length,
          new: insertedContacts.length,
          existing: existingContactsForWebhook.length
        }
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