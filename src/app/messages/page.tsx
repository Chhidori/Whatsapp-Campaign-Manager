'use client';

import { useState, useEffect, useCallback } from 'react';
import { ContactWithHistory, MessageHistory, CustomSettings } from '@/types/campaign';
import ContactList from '@/components/messages/ContactList';
import MessageView from '@/components/messages/MessageView';
import { useAuth } from '@/contexts/AuthContext';

interface ContactsResponse {
  contacts: ContactWithHistory[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export default function MessagesPage() {
  const { user } = useAuth();
  
  const [contacts, setContacts] = useState<ContactWithHistory[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactWithHistory | null>(null);
  const [messages, setMessages] = useState<MessageHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [customSettings, setCustomSettings] = useState<CustomSettings | null>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [contactsPerPage] = useState(20); // Show 20 contacts per page

  // Fetch user's custom settings
  const fetchCustomSettings = useCallback(async () => {
    if (!user?.email) return;
    
    try {
      const response = await fetch(`/api/user-schema/custom-settings?username=${encodeURIComponent(user.email)}`);
      const data = await response.json();
      
      if (data.custom_settings) {
        setCustomSettings(data.custom_settings);
      }
    } catch (error) {
      console.error('Error fetching custom settings:', error);
    }
  }, [user?.email]);

  const fetchContacts = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/contacts?page=${page}&limit=${contactsPerPage}`);
      const data: ContactsResponse = await response.json();
      
      if (data.contacts) {
        setContacts(data.contacts);
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  }, [contactsPerPage]);

  useEffect(() => {
    fetchContacts(currentPage);
  }, [currentPage, fetchContacts]);

  useEffect(() => {
    fetchCustomSettings();
  }, [fetchCustomSettings]);

  // Add visibility change listener to pause/resume polling when tab is not active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && selectedContact) {
        // When tab becomes visible again, silently refresh messages
        fetchMessagesSilent(selectedContact.lead_id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [selectedContact]);

  const fetchMessages = async (leadId: string) => {
    setMessagesLoading(true);
    try {
      const response = await fetch(`/api/messages/${leadId}`);
      const data = await response.json();
      // Ensure data is an array
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]); // Set empty array on error
    } finally {
      setMessagesLoading(false);
    }
  };

  // Silent fetch for automatic polling - no loading state
  const fetchMessagesSilent = async (leadId: string) => {
    try {
      const response = await fetch(`/api/messages/${leadId}`);
      const data = await response.json();
      // Ensure data is an array
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching messages silently:', error);
      // Don't clear messages on error during silent fetch
    }
  };

  // Silent fetch for contacts - no loading state with improved comparison
  const fetchContactsSilent = useCallback(async (page: number) => {
    try {
      const response = await fetch(`/api/contacts?page=${page}&limit=${contactsPerPage}`);
      const data: ContactsResponse = await response.json();
      
      if (data.contacts) {
        setContacts(prevContacts => {
          // More efficient comparison by checking length and key properties
          if (prevContacts.length !== data.contacts.length) {
            return data.contacts;
          }
          
          // Check if any contact has changed by comparing key properties
          const hasChanges = data.contacts.some((newContact, index) => {
            const prevContact = prevContacts[index];
            return !prevContact ||
                   prevContact.lead_id !== newContact.lead_id ||
                   prevContact.name !== newContact.name ||
                   prevContact.lead_status !== newContact.lead_status ||
                   prevContact.unread_count !== newContact.unread_count ||
                   prevContact.last_message?.created_date !== newContact.last_message?.created_date ||
                   prevContact.last_message?.message_text !== newContact.last_message?.message_text;
          });
          
          return hasChanges ? data.contacts : prevContacts;
        });
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);
      }
    } catch (error) {
      console.error('Error fetching contacts silently:', error);
      // Don't clear contacts on error during silent fetch
    }
  }, [contactsPerPage]);

  // Set up polling for contacts with visibility check
  useEffect(() => {
    const pollInterval = setInterval(() => {
      // Only poll when document is visible to avoid unnecessary API calls
      if (!document.hidden) {
        fetchContactsSilent(currentPage);
      }
    }, 15000); // Reduced frequency to 15 seconds to avoid too many requests

    return () => clearInterval(pollInterval);
  }, [currentPage, fetchContactsSilent]);

  const handleContactSelect = (contact: ContactWithHistory) => {
    // Don't reload messages if selecting the same contact
    if (selectedContact?.lead_id === contact.lead_id) {
      return;
    }
    
    setSelectedContact(contact);
    // Clear previous messages immediately to show loading state
    setMessages([]);
    fetchMessages(contact.lead_id);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // Clear selected contact when changing pages
    setSelectedContact(null);
    setMessages([]);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Sidebar - Contact List */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
          {totalCount > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {totalCount} total contacts
            </p>
          )}
        </div>
        <ContactList
          contacts={contacts}
          selectedContact={selectedContact}
          onContactSelect={handleContactSelect}
          loading={loading}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Right Side - Message View */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <MessageView
            contact={selectedContact}
            messages={messages}
            loading={messagesLoading}
            onMessageSent={() => fetchMessages(selectedContact.lead_id)}
            onSilentRefresh={() => fetchMessagesSilent(selectedContact.lead_id)}
            unreadCount={selectedContact.unread_count || 0}
            customSettings={customSettings}
            onMessagesRead={() => {
              // Update the selected contact's unread count immediately for responsive UI
              setSelectedContact(prev => prev ? { ...prev, unread_count: 0 } : null);
              // Update the contact in the contacts list
              setContacts(prevContacts => 
                prevContacts.map(contact => 
                  contact.lead_id === selectedContact.lead_id 
                    ? { ...contact, unread_count: 0 }
                    : contact
                )
              );
            }}
            onContactUpdate={(updatedContact) => {
              // Update the selected contact
              setSelectedContact(updatedContact);
              // Update the contact in the contacts list only if it has actually changed
              setContacts(prevContacts => {
                const updatedContacts = prevContacts.map(contact => 
                  contact.lead_id === updatedContact.lead_id 
                    ? updatedContact
                    : contact
                );
                
                // Only update if the contact actually changed
                const existingContact = prevContacts.find(c => c.lead_id === updatedContact.lead_id);
                if (existingContact && existingContact.lead_status === updatedContact.lead_status) {
                  return prevContacts;
                }
                
                return updatedContacts;
              });
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-lg">Select a contact to view message history</p>
              {totalCount > 0 && (
                <p className="text-sm mt-2">
                  Browse through {totalCount} contacts using the pagination controls
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}