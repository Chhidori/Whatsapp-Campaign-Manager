'use client';

import { ContactWithHistory } from '@/types/campaign';

const formatTimeAgo = (date: string) => {
  const now = new Date();
  // Parse the UTC date string and convert to local time
  const messageDate = new Date(date + (date.includes('Z') ? '' : 'Z')); // Ensure UTC parsing
  const diffInMinutes = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  // Convert to local date string
  return messageDate.toLocaleDateString();
};

interface ContactListProps {
  contacts: ContactWithHistory[];
  selectedContact: ContactWithHistory | null;
  onContactSelect: (contact: ContactWithHistory) => void;
  loading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function ContactList({
  contacts,
  selectedContact,
  onContactSelect,
  loading,
  currentPage,
  totalPages,
  onPageChange,
}: ContactListProps) {
  if (loading) {
    return (
      <div className="flex-1 p-4">
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-3 p-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">👥</div>
          <p>No contacts found</p>
        </div>
      </div>
    );
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      onPageChange(newPage);
    }
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto contact-list">
        {contacts.map((contact) => (
        <div
          key={contact.lead_id}
          onClick={() => onContactSelect(contact)}
          className={`
            flex items-center p-4 border-b border-gray-100 cursor-pointer transition-colors
            hover:bg-gray-50
            ${selectedContact?.lead_id === contact.lead_id ? 'bg-blue-50 border-blue-200' : ''}
          `}
        >
          {/* Avatar */}
          <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center mr-3">
            <span className="text-gray-600 font-medium">
              {contact.name ? contact.name.charAt(0).toUpperCase() : '?'}
            </span>
          </div>

          {/* Contact Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {contact.name || 'Unknown Contact'}
              </h3>
              {contact.last_message && (
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(contact.last_message.created_date)}
                </span>
              )}
            </div>
            
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm text-gray-500 truncate">
                {contact.last_message?.message_text || 'No messages yet'}
              </p>
              {(contact.unread_count || 0) > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {contact.unread_count}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Pagination Controls */}
    {totalPages > 1 && (
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1 text-sm rounded ${
                      currentPage === pageNum
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}