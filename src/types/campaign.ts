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

export interface MessageHistory {
  id: string;
  message_id?: string;
  from_number: string;
  to_number: string;
  message_varchar?: string;
  message_time: string;
  message_type?: string;
  wa_id?: string;
  status?: string;
  updated_date: string;
  created_date: string;
  campaign_id?: string;
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