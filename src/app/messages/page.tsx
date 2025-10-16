'use client';

import { useState, useEffect, useCallback } from 'react';
import { ContactWithHistory, MessageHistory } from '@/types/campaign';
import ContactList from '@/components/messages/ContactList';
import MessageView from '@/components/messages/MessageView';

interface ContactsResponse {
  contacts: ContactWithHistory[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export default function MessagesPage() {
  const [contacts, setContacts] = useState<ContactWithHistory[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactWithHistory | null>(null);
  const [messages, setMessages] = useState<MessageHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [contactsPerPage] = useState(20); // Show 20 contacts per page

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

  // Silent fetch for contacts - no loading state
  const fetchContactsSilent = useCallback(async (page: number) => {
    try {
      const response = await fetch(`/api/contacts?page=${page}&limit=${contactsPerPage}`);
      const data: ContactsResponse = await response.json();
      
      if (data.contacts) {
        setContacts(prevContacts => {
          // Compare the new contacts with previous ones
          const contactsChanged = JSON.stringify(data.contacts) !== JSON.stringify(prevContacts);
          return contactsChanged ? data.contacts : prevContacts;
        });
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);
      }
    } catch (error) {
      console.error('Error fetching contacts silently:', error);
      // Don't clear contacts on error during silent fetch
    }
  }, [contactsPerPage]);

  // Set up polling for contacts
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchContactsSilent(currentPage);
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(pollInterval);
  }, [currentPage, fetchContactsSilent]);

  const handleContactSelect = (contact: ContactWithHistory) => {
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
            onMessagesRead={() => {
              // Update the selected contact's unread count
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