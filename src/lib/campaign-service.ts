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

  // Get campaigns with pagination
  static async getCampaignsPaginated(supabase: SupabaseClientType, page: number = 1, limit: number = 10): Promise<{ data: Campaign[] | null; total: number; error: ServiceError }> {
    try {
      const offset = (page - 1) * limit;
      
      // Get total count
      const { count, error: countError } = await supabase
        .from('wa_campaigns')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        return { data: null, total: 0, error: countError };
      }

      // Get paginated data
      const { data, error } = await supabase
        .from('wa_campaigns')
        .select('*')
        .order('created_date', { ascending: false })
        .range(offset, offset + limit - 1);

      return { data, total: count || 0, error };
    } catch (error) {
      console.error('Error fetching paginated campaigns:', error);
      return { data: null, total: 0, error: error instanceof Error ? error : new Error('Unknown error') };
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

  // Validate phone number format (flexible - with or without + prefix)
  static validatePhoneNumber(phone: string): boolean {
    // Allow phone numbers with or without + prefix
    // With +: +[country code][number] (7-15 digits total)
    const e164Regex = /^\+[1-9]\d{6,14}$/;
    // Without +: [country code][number] (7-15 digits, but must start with valid country code)
    const numericRegex = /^[1-9]\d{6,14}$/;
    
    return e164Regex.test(phone) || numericRegex.test(phone);
  }

  // Enhanced validation with country-specific rules
  static validatePhoneNumberForCountry(phone: string): boolean {
    const countryRules: Record<string, { minDigits: number; maxDigits: number }> = {
      '+1': { minDigits: 10, maxDigits: 10 }, // US/Canada
      '+91': { minDigits: 10, maxDigits: 10 }, // India
      '+44': { minDigits: 10, maxDigits: 11 }, // UK
      '+86': { minDigits: 11, maxDigits: 11 }, // China
      '+81': { minDigits: 10, maxDigits: 11 }, // Japan
      '+49': { minDigits: 10, maxDigits: 12 }, // Germany
      '+33': { minDigits: 9, maxDigits: 10 }, // France
      '+61': { minDigits: 9, maxDigits: 9 }, // Australia
      '+55': { minDigits: 10, maxDigits: 11 }, // Brazil
      '+52': { minDigits: 10, maxDigits: 10 } // Mexico
    };

    // Extract country code
    const countryCodeMatch = phone.match(/^\+(\d{1,3})/);
    if (!countryCodeMatch) return this.validatePhoneNumber(phone); // Fallback to basic validation
    
    const countryCode = `+${countryCodeMatch[1]}`;
    const phoneWithoutCountry = phone.replace(countryCode, '');
    const digits = phoneWithoutCountry.replace(/\D/g, '');
    
    const rule = countryRules[countryCode];
    if (!rule) {
      // Unknown country code - use generic validation
      return digits.length >= 7 && digits.length <= 15;
    }
    
    return digits.length >= rule.minDigits && digits.length <= rule.maxDigits;
  }

  // Format phone number - minimal cleaning, preserve + if present
  static formatPhoneNumber(phone: string): string {
    // Only remove spaces, dashes, brackets, and other formatting characters
    // Keep digits and + symbol exactly as provided
    const cleaned = phone.replace(/[\s\-\(\)\.\s]/g, '');
    
    // Return exactly as provided (with or without + prefix)
    return cleaned;
  }
}