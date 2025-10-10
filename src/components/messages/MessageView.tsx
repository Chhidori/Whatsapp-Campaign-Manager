'use client';

import { ContactWithHistory, MessageHistory } from '@/types/campaign';

interface MessageViewProps {
  contact: ContactWithHistory;
  messages: MessageHistory[];
  loading: boolean;
}

const formatMessageTime = (date: string) => {
  const messageDate = new Date(date);
  return messageDate.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
};

const formatDateGroup = (date: string) => {
  const messageDate = new Date(date);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (messageDate.toDateString() === now.toDateString()) {
    return 'Today';
  } else if (messageDate.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return messageDate.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }
};

const groupMessagesByDate = (messages: MessageHistory[]) => {
  // Ensure messages is an array and not null/undefined
  if (!Array.isArray(messages) || messages.length === 0) {
    return [];
  }
  
  const groups: { [date: string]: MessageHistory[] } = {};
  
  messages.forEach(message => {
    const dateKey = new Date(message.created_date).toDateString();
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
  });
  
  return Object.entries(groups).map(([dateKey, msgs]) => ({
    date: dateKey,
    dateLabel: formatDateGroup(msgs[0].created_date),
    messages: msgs
  }));
};

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'sent':
      return '✓';
    case 'delivered':
      return '✓✓';
    case 'read':
      return '✓✓';
    case 'failed':
      return '✗';
    default:
      return '';
  }
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'sent':
      return 'text-gray-400';
    case 'delivered':
      return 'text-blue-400';
    case 'read':
      return 'text-blue-500';
    case 'failed':
      return 'text-red-500';
    default:
      return 'text-gray-300';
  }
};

export default function MessageView({ contact, messages, loading }: MessageViewProps) {
  // Message direction detection using message_type field
  const getMessageDirection = (message: MessageHistory) => {
    // message_type contains 'Outgoing' or 'Incoming'
    return message.message_type === 'Outgoing';
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gray-200 rounded-full mr-3 animate-pulse"></div>
            <div className="space-y-1">
              <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Messages Loading */}
        <div className="flex-1 p-4 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <div className="max-w-xs">
                <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-16 mt-1 animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center mr-3">
            <span className="text-gray-600 font-medium">
              {contact.name ? contact.name.charAt(0).toUpperCase() : '?'}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {contact.name || 'Unknown Contact'}
            </h2>
            <p className="text-sm text-gray-500">Lead ID: {contact.lead_id}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 message-container">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">💬</div>
              <p>No messages yet</p>
            </div>
          </div>
        ) : (
          groupMessagesByDate(messages || []).map((group) => (
            <div key={group.date} className="mb-6">
              {/* Date Header */}
              <div className="flex justify-center mb-4">
                <div className="bg-white px-3 py-1 rounded-full shadow-sm border text-xs text-gray-600">
                  {group.dateLabel}
                </div>
              </div>
              
              {/* Messages for this date */}
              <div className="space-y-3">
                {group.messages.map((message) => {
                  const isOutgoing = getMessageDirection(message);
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${isOutgoing ? 'text-right' : 'text-left'}`}>
                        <div
                          className={`
                            p-3 rounded-lg inline-block relative
                            ${isOutgoing 
                              ? 'bg-blue-500 text-white rounded-br-sm' 
                              : 'bg-white text-gray-900 rounded-bl-sm shadow-sm border'
                            }
                          `}
                        >
                          <p className="text-sm">{message.message_text}</p>
                          
                          {/* Time and Status in message bubble */}
                          <div className={`flex items-center justify-end mt-2 text-xs ${isOutgoing ? 'text-blue-100' : 'text-gray-500'}`}>
                            <span>{formatMessageTime(message.created_date)}</span>
                            {isOutgoing && getStatusIcon(message.status) && (
                              <span className={`ml-1 ${isOutgoing ? 'text-blue-200' : getStatusColor(message.status)}`}>
                                {getStatusIcon(message.status)}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Unread indicator for incoming messages */}
                        {!message.is_read && !isOutgoing && (
                          <div className="flex justify-start mt-1">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Message Input (Optional - for future sending capability) */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled
          />
          <button
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            disabled
          >
            Send
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">Message sending will be available in future updates</p>
      </div>
    </div>
  );
}