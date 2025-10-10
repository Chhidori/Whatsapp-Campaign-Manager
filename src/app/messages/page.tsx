'use client';

import { useState, useEffect } from 'react';
import { ContactWithHistory, MessageHistory } from '@/types/campaign';
import ContactList from '@/components/messages/ContactList';
import MessageView from '@/components/messages/MessageView';

export default function MessagesPage() {
  const [contacts, setContacts] = useState<ContactWithHistory[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactWithHistory | null>(null);
  const [messages, setMessages] = useState<MessageHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [contactsPerPage] = useState(20); // Show 20 contacts per page

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/contacts');
      const data = await response.json();
      setContacts(data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleContactSelect = (contact: ContactWithHistory) => {
    setSelectedContact(contact);
    fetchMessages(contact.lead_id);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Sidebar - Contact List */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
        </div>
        <ContactList
          contacts={contacts}
          selectedContact={selectedContact}
          onContactSelect={handleContactSelect}
          loading={loading}
          currentPage={currentPage}
          contactsPerPage={contactsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Right Side - Message View */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <MessageView
            contact={selectedContact}
            messages={messages}
            loading={messagesLoading}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-lg">Select a contact to view message history</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}