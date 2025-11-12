import { Campaign, Contact, CreateCampaignData, ImportContact } from '@/types/campaign';

type ServiceError = Error | null;

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseClientType = {
  schema: (schema: string) => any;
  from: (table: string) => any;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export class CampaignService {
  
  // Test connection to the schema and table with retry logic
  static async testConnection(supabase: SupabaseClientType, retries: number = 3): Promise<boolean> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Testing database connection, attempt ${attempt}/${retries}`);
        
        // Add a small delay for retries
        if (attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }

        const { error } = await supabase
          .from('wa_campaigns')
          .select('count')
          .limit(1);

        if (error) {
          console.error(`Database connection test failed (attempt ${attempt}):`, error);
          
          // Don't retry for schema/permission errors
          if (error.message?.includes('does not exist') || 
              error.message?.includes('permission denied') ||
              error.message?.includes('schema') && error.message?.includes('does not exist')) {
            console.error('Schema or permission error - not retrying');
            return false;
          }
          
          // For network errors, continue to retry
          if (attempt === retries) {
            console.error('Database connection failed after all retries');
            return false;
          }
          
          continue;
        }

        console.log('Database connection test successful');
        return true;
        
      } catch (error) {
        console.error(`Database connection test exception (attempt ${attempt}):`, error);
        
        if (attempt === retries) {
          console.error('Database connection test failed after all retries with exception:', error);
          return false;
        }
      }
    }
    
    return false;
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

  // Import contacts in bulk with proper duplicate handling and custom fields update
  static async importContacts(supabase: SupabaseClientType, contacts: ImportContact[]): Promise<{ data: Contact[] | null; error: ServiceError }> {
    try {
      console.log('👥 CampaignService.importContacts called with:', contacts.length, 'contacts');
      
      const processedContacts: Contact[] = [];
      const errors: string[] = [];

      for (const contact of contacts) {
        try {
          // Normalize phone number
          const normalizedPhone = this.formatPhoneNumber(contact.phone_number);
          
          if (!this.validatePhoneNumber(normalizedPhone)) {
            errors.push(`Invalid phone number: ${contact.phone_number}`);
            continue;
          }

          // Check if contact already exists
          const { data: existingContact, error: checkError } = await supabase
            .from('wa_contacts')
            .select('*')
            .eq('phone_number', normalizedPhone)
            .maybeSingle();

          if (checkError) {
            console.error('Error checking existing contact:', checkError);
            errors.push(`Error checking contact ${normalizedPhone}: ${checkError.message}`);
            continue;
          }

          if (existingContact) {
            // Contact exists - update it, preserving the same lead_id
            console.log(`📞 Found existing contact for ${normalizedPhone}:`, {
              lead_id: existingContact.lead_id,
              existing_custom_fields: existingContact.custom_fields,
              new_custom_fields: contact.custom_fields
            });
            
            // Get existing custom fields (handle null/undefined)
            const existingCustomFields = existingContact.custom_fields && typeof existingContact.custom_fields === 'object' 
              ? existingContact.custom_fields 
              : {};
            
            const newCustomFields = contact.custom_fields && typeof contact.custom_fields === 'object'
              ? contact.custom_fields 
              : {};
            
            // Merge custom fields (new fields override existing ones)
            const mergedCustomFields = { ...existingCustomFields, ...newCustomFields };
            
            console.log(`🔄 Merging custom fields for ${normalizedPhone}:`, {
              existing: existingCustomFields,
              new: newCustomFields,
              merged: mergedCustomFields,
              mergedKeys: Object.keys(mergedCustomFields),
              mergedCount: Object.keys(mergedCustomFields).length
            });
            
            // Build update object - ALWAYS include custom_fields (even if empty object)
            /* eslint-disable @typescript-eslint/no-explicit-any */
            const updatePayload: Record<string, any> = {
              custom_fields: Object.keys(mergedCustomFields).length > 0 ? mergedCustomFields : {}
            };
            /* eslint-enable @typescript-eslint/no-explicit-any */
            
            // Only update name if a new one is provided
            if (contact.name && contact.name.trim()) {
              updatePayload.name = contact.name;
            }
            
            console.log(`📝 Updating contact ${existingContact.lead_id} with payload:`, JSON.stringify(updatePayload, null, 2));
            
            const { data: updatedResults, error: updateError } = await supabase
              .from('wa_contacts')
              .update(updatePayload)
              .eq('lead_id', existingContact.lead_id)
              .select();

            if (updateError) {
              console.error('❌ Error updating contact:', updateError);
              errors.push(`Error updating contact ${normalizedPhone}: ${updateError.message}`);
            } else {
              console.log(`✅ Successfully updated existing contact: ${normalizedPhone} (lead_id: ${existingContact.lead_id})`);
              
              // Use the returned data from update (which includes the updated record)
              if (updatedResults && updatedResults.length > 0) {
                const updatedContact = updatedResults[0];
                console.log(`✅ Updated contact data:`, {
                  lead_id: updatedContact.lead_id,
                  name: updatedContact.name,
                  custom_fields: updatedContact.custom_fields
                });
                processedContacts.push(updatedContact);
              } else {
                // Fallback: construct the updated object
                const finalContact = {
                  ...existingContact,
                  name: updatePayload.name || existingContact.name,
                  custom_fields: mergedCustomFields
                };
                console.log(`⚠️ Using fallback contact data:`, finalContact);
                processedContacts.push(finalContact);
              }
            }
          } else {
            // Contact doesn't exist - create new one
            const newLeadId = this.generateLeadId();
            const newContact = {
              lead_id: newLeadId,
              name: contact.name,
              phone_number: normalizedPhone,
              custom_fields: contact.custom_fields || {}
            };

            const { data: createdContact, error: createError } = await supabase
              .from('wa_contacts')
              .insert([newContact])
              .select()
              .single();

            if (createError) {
              console.error('Error creating contact:', createError);
              errors.push(`Error creating contact ${normalizedPhone}: ${createError.message}`);
            } else {
              console.log(`Created new contact: ${normalizedPhone} (lead_id: ${newLeadId})`);
              processedContacts.push(createdContact);
            }
          }
        } catch (contactError) {
          console.error('Error processing contact:', contactError);
          errors.push(`Error processing contact ${contact.phone_number}: ${contactError instanceof Error ? contactError.message : 'Unknown error'}`);
        }
      }

      if (errors.length > 0) {
        console.warn('Import completed with errors:', errors);
      }

      console.log(`Import completed: ${processedContacts.length} contacts processed, ${errors.length} errors`);
      
      return { 
        data: processedContacts, 
        error: errors.length > 0 ? new Error(`Import completed with ${errors.length} errors: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`) : null 
      };
    } catch (error) {
      console.error('Error importing contacts:', error);
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }

  // Generate a unique lead ID
  static generateLeadId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `lead_${timestamp}_${randomStr}`;
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