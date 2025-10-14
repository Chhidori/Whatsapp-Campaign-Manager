import { NextRequest, NextResponse } from 'next/server';
import { getUserSchemaFromServerCookies } from '@/lib/server-user-schema';

export async function POST(request: NextRequest) {
  try {
    console.log('=== INDIVIDUAL MESSAGE SEND STARTED ===');
    
    const body = await request.json();
    console.log('Request body received:', JSON.stringify(body, null, 2));
    
    const { lead_id, message_content, phone_number, name, campaign_id } = body;
    console.log('Extracted data:', { lead_id, message_content, phone_number, name, campaign_id });

    // Validate required fields
    if (!lead_id || !message_content) {
      return NextResponse.json(
        { error: 'Missing required fields: lead_id and message_content are required' },
        { status: 400 }
      );
    }

    // Prepare webhook payload for individual message (same as campaign payload but no template_id or template_name)
    const webhookUrl = process.env.SINGLE_MESSAGE_WEBHOOK_ENDPOINT;
    
    if (!webhookUrl) {
      return NextResponse.json({ 
        error: 'Webhook URL not configured. Please set SINGLE_MESSAGE_WEBHOOK_ENDPOINT environment variable.' 
      }, { status: 500 });
    }
    
    // Get user schema for the webhook request
    const userSchema = await getUserSchemaFromServerCookies();
    console.log('User schema for individual message webhook:', userSchema);
    
    const webhookPayload = {
      name: name || '',
      Phone: phone_number || '',
      campaign_id: campaign_id || null, // Include campaign_id if available
      lead_id: lead_id,
      message_content: message_content, // This is the extra field - the message user typed
      schema_name: userSchema
      // Exclude template_id and template_name for individual messages
    };

    console.log('Sending individual message webhook to:', webhookUrl);
    console.log('Webhook payload:', JSON.stringify(webhookPayload, null, 2));

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
        return NextResponse.json({
          success: false,
          error: 'Failed to send message',
          details: errorText
        }, { status: 500 });
      }

      const webhookResult = await webhookResponse.json();
      console.log('Message webhook success:', webhookResult);

      return NextResponse.json({
        success: true,
        message: 'Message sent successfully',
        webhookResult
      });

    } catch (webhookError) {
      console.error('Webhook request error:', webhookError);
      return NextResponse.json({
        success: false,
        error: 'Failed to send webhook request',
        details: webhookError instanceof Error ? webhookError.message : String(webhookError)
      }, { status: 500 });
    }

  } catch (error) {
    console.error('=== UNEXPECTED ERROR IN MESSAGE SEND ===');
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Failed to send message',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}