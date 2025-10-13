import { Campaign, Contact, CreateCampaignData, ImportContact } from '@/types/campaign';

type ServiceError = Error | null;

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseClientType = {
  schema: (schema: string) => any;
  from: (table: string) => any;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export class CampaignService {
  
  // Test connection to the schema and table
  static async testConnection(supabase: SupabaseClientType): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('wa_campaigns')
        .select('count')
        .limit(1);

      return !error;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  // Create a new campaign
  static async createCampaign(supabase: SupabaseClientType, campaignData: CreateCampaignData): Promise<{ data: Campaign | null; error: ServiceError }> {
    try {

      
      const { data, error } = await supabase
        .from('wa_campaigns')
        .insert([campaignData])
        .select()
        .single();



      return { data, error };
    } catch (error) {
      console.error('💥 Exception in createCampaign:', error);
      console.error('💥 Exception type:', typeof error);
      console.error('💥 Exception stack:', error instanceof Error ? error.stack : 'No stack');
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }

  // Get all campaigns
  static async getCampaigns(supabase: SupabaseClientType): Promise<{ data: Campaign[] | null; error: ServiceError }> {
    try {
      const { data, error } = await supabase
        .from('wa_campaigns')
        .select('*')
        .order('created_date', { ascending: false });

      return { data, error };
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }

  // Get campaign by id
  static async getCampaignById(supabase: SupabaseClientType, id: string): Promise<{ data: Campaign | null; error: ServiceError }> {
    try {
      const { data, error } = await supabase
        .from('wa_campaigns')
        .select('*')
        .eq('id', id)
        .single();

      return { data, error };
    } catch (error) {
      console.error('Error fetching campaign:', error);
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }

  // Update campaign
  static async updateCampaign(supabase: SupabaseClientType, id: string, updates: Partial<Campaign>): Promise<{ data: Campaign | null; error: ServiceError }> {
    try {
      const { data, error } = await supabase
        .from('wa_campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('Error updating campaign:', error);
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }

  // Import contacts in bulk
  static async importContacts(supabase: SupabaseClientType, contacts: ImportContact[]): Promise<{ data: Contact[] | null; error: ServiceError }> {
    try {
      console.log('👥 CampaignService.importContacts called with:', contacts.length, 'contacts');
      


      const { data, error } = await supabase
        .from('wa_contacts')
        .upsert(contacts, { onConflict: 'phone_number' })
        .select();

      return { data, error };
    } catch (error) {
      console.error('Error importing contacts:', error);
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }

  // Get all contacts
  static async getContacts(supabase: SupabaseClientType): Promise<{ data: Contact[] | null; error: ServiceError }> {
    try {
      const { data, error } = await supabase
        .from('wa_contacts')
        .select('*')
        .order('created_date', { ascending: false });

      return { data, error };
    } catch (error) {
      console.error('Error fetching contacts:', error);
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }

  // Validate phone number format (basic E.164 check)
  static validatePhoneNumber(phone: string): boolean {
    // Basic E.164 format: +[country code][number] (7-15 digits total)
    const e164Regex = /^\+[1-9]\d{6,14}$/;
    return e164Regex.test(phone);
  }

  // Format phone number to E.164 if possible
  static formatPhoneNumber(phone: string): string {
    // Remove all non-digits except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // If it doesn't start with +, assume it needs a + prefix
    if (!cleaned.startsWith('+')) {
      // You might want to add default country code logic here
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }
}