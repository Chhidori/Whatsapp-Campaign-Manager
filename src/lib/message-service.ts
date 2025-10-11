import { supabase } from '@/lib/supabase';
import { ContactWithHistory, MessageHistory } from '@/types/campaign';

export class MessageService {
  /**
   * Get paginated contacts from the contact_summaries view
   * Simple and fast - just query the view with pagination
   */
  static async getContacts(page: number = 1, limit: number = 20): Promise<{
    contacts: ContactWithHistory[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    try {
      const offset = (page - 1) * limit;

      // Get total count
      const { count: totalCount, error: countError } = await supabase
        .from('contact_summaries')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        throw countError;
      }

      // Query the view with pagination
      const { data: contactSummaries, error: queryError } = await supabase
        .from('contact_summaries')
        .select('*')
        .order('recent_timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (queryError) {
        throw queryError;
      }

      // Transform to ContactWithHistory format
      const contactsWithHistory: ContactWithHistory[] = (contactSummaries || []).map((contact: {
        owner_name: string;
        lead_id: string;
        recent_timestamp: string;
        recent_message_text: string;
        unread_count?: number;
      }) => ({
        name: contact.owner_name,
        lead_id: contact.lead_id,
        last_message: contact.recent_timestamp ? {
          id: `summary_${contact.lead_id}`,
          message_id: '',
          from_number: '',
          to_number: '',
          message_text: contact.recent_message_text,
          message_type: 'Outgoing' as const,
          status: 'sent' as const,
          lead_id: contact.lead_id,
          is_read: false,
          created_date: contact.recent_timestamp,
          campaign_id: undefined,
        } : undefined,
        unread_count: contact.unread_count || 0,
      }));

      return {
        contacts: contactsWithHistory,
        totalCount: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
        currentPage: page,
      };
    } catch (error) {
      console.error('Error fetching contacts:', error);
      throw error;
    }
  }

  /**
   * Get all messages for a specific lead (called when contact is clicked)
   */
  static async getMessages(leadId: string): Promise<MessageHistory[]> {
    try {
      const { data: messages, error } = await supabase
        .from('wa_message_history')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_date', { ascending: true });

      if (error) {
        throw error;
      }

      return messages || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  /**
   * Mark messages as read for a specific lead
   */
  static async markMessagesAsRead(leadId: string, messageIds?: string[]): Promise<void> {
    try {
      let query = supabase
        .from('wa_message_history')
        .update({ is_read: true })
        .eq('lead_id', leadId);

      // If specific message IDs are provided, only update those
      if (messageIds && messageIds.length > 0) {
        query = query.in('id', messageIds);
      }

      const { error } = await query;

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }
}