import { supabase } from '@/lib/supabase';
import { ContactWithHistory, MessageHistory } from '@/types/campaign';

export class MessageService {
  /**
   * Get all contacts with their latest message and unread count
   */
  static async getContacts(): Promise<ContactWithHistory[]> {
    try {
      // Fetch contacts from wa_contacts table
      const { data: contacts, error: contactsError } = await supabase
        .from('wa_contacts')
        .select('name, lead_id');

      if (contactsError) {
        throw contactsError;
      }

      if (!contacts || contacts.length === 0) {
        return [];
      }

      // For each contact, get their latest message and unread count
      const contactsWithHistory: ContactWithHistory[] = await Promise.all(
        contacts.map(async (contact: { name: string; lead_id: string }) => {
          // Get latest message
          const { data: latestMessage } = await supabase
            .from('wa_message_history')
            .select('*')
            .eq('lead_id', contact.lead_id)
            .order('created_date', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Get unread count
          const { count: unreadCount } = await supabase
            .from('wa_message_history')
            .select('*', { count: 'exact', head: true })
            .eq('lead_id', contact.lead_id)
            .eq('is_read', false);

          return {
            ...contact,
            last_message: latestMessage || undefined,
            unread_count: unreadCount || 0,
          };
        })
      );

      // Sort by latest message date
      contactsWithHistory.sort((a, b) => {
        const aDate = a.last_message ? new Date(a.last_message.created_date).getTime() : 0;
        const bDate = b.last_message ? new Date(b.last_message.created_date).getTime() : 0;
        return bDate - aDate;
      });

      return contactsWithHistory;
    } catch (error) {
      console.error('Error fetching contacts:', error);
      throw error;
    }
  }

  /**
   * Get all messages for a specific lead
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




}