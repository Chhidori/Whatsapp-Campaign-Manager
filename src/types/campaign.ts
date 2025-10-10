export interface Campaign {
  id: string;
  name: string;
  description?: string;
  template_name: string;
  template_language: string;
  scheduled_at?: string;
  status: 'draft' | 'queued' | 'running' | 'paused' | 'done';
  created_date: string;
  updated_date: string;
}

export interface Contact {
  id: string;
  name?: string;
  phone_number: string;
  created_date: string;
}

// WhatsApp Contact from wa_contacts table
export interface WAContact {
  name: string;
  lead_id: string;
}

// Message History from wa_message_history table
export interface MessageHistory {
  id: string;
  message_id?: string;
  from_number: string;
  to_number: string;
  message_text: string;
  message_type: 'Outgoing' | 'Incoming';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  lead_id: string;
  is_read: boolean;
  created_date: string;
  campaign_id?: string;
}

// Extended contact with message history
export interface ContactWithHistory extends WAContact {
  last_message?: MessageHistory;
  unread_count?: number;
}

export interface CreateCampaignData {
  name: string;
  description?: string;
  template_name: string;
  template_language: string;
  scheduled_at: string;
}

export interface ImportContact {
  name?: string;
  phone_number: string;
}