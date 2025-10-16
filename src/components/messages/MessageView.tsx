'use client';

import { useState, useEffect, useRef } from 'react';
import { ContactWithHistory, MessageHistory } from '@/types/campaign';
import { SquareCheckBig, Loader2 } from 'lucide-react';

interface MessageViewProps {
  contact: ContactWithHistory;
  messages: MessageHistory[];
  loading: boolean;
  onMessageSent?: () => void; // Callback to refresh messages after sending
  onSilentRefresh?: () => void; // Callback for silent refresh (no loading state)
  unreadCount?: number;
  onMessagesRead?: () => void; // Callback when messages are marked as read
}

const formatMessageTime = (date: string) => {
  // Parse UTC date and convert to local time
  const messageDate = new Date(date + (date.includes('Z') ? '' : 'Z'));
  return messageDate.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
};

const formatDateGroup = (date: string) => {
  // Parse UTC date and convert to local time
  const messageDate = new Date(date + (date.includes('Z') ? '' : 'Z'));
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
    // Parse UTC date and convert to local time for grouping
    const messageDate = new Date(message.created_date + (message.created_date.includes('Z') ? '' : 'Z'));
    const dateKey = messageDate.toDateString();
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
    case 'pending':
    case 'queued':
      return '🕐';
    case 'failed':
      return '❌';
    default:
      return '';
  }
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'sent':
      return 'text-gray-400'; // Single gray check
    case 'delivered':
      return 'text-gray-400'; // Double gray checks
    case 'read':
      return 'text-white'; // Double white checks
    case 'pending':
    case 'queued':
      return 'text-gray-400'; // Gray clock
    case 'failed':
      return 'text-red-500'; // Red X
    default:
      return 'text-gray-300';
  }
};

const getStatusText = (status: string) => {
  switch (status.toLowerCase()) {
    case 'sent':
      return 'Sent';
    case 'delivered':
      return 'Delivered';
    case 'read':
      return 'Read';
    case 'pending':
      return 'Pending';
    case 'queued':
      return 'Queued';
    case 'failed':
      return 'Failed to send';
    default:
      return status;
  }
};

export default function MessageView({ contact, messages, loading, onMessageSent, onSilentRefresh, unreadCount = 0, onMessagesRead }: MessageViewProps) {
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [markingAsRead, setMarkingAsRead] = useState(false);
  const [localUnreadCount, setLocalUnreadCount] = useState(unreadCount);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Message direction detection using message_type field
  const getMessageDirection = (message: MessageHistory) => {
    // message_type contains 'Outgoing' or 'Incoming'
    return message.message_type === 'Outgoing';
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Auto-scroll to bottom when messages change and sync unread count
  useEffect(() => {
    scrollToBottom();
    setLocalUnreadCount(unreadCount);
  }, [messages, unreadCount]);

  // Scroll to bottom when component first loads or contact changes
  useEffect(() => {
    if (!loading && messages.length > 0) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(scrollToBottom, 100);
    }
  }, [loading, contact?.lead_id, messages.length]);

  // Polling for new incoming messages
  useEffect(() => {
    if (!contact?.lead_id || (!onMessageSent && !onSilentRefresh)) return;

    // Update message count when messages change
    setLastMessageCount(messages.length);

    const checkForNewMessages = async () => {
      // Don't poll when tab is not active or when sending a message
      if (document.hidden || sending) return;
      
      console.log('Checking for new messages...', { leadId: contact.lead_id });
      
      try {
        const response = await fetch(`/api/messages/${contact.lead_id}`);
        if (response.ok) {
          const newMessages = await response.json();
          
          // Check if there are new messages
          if (newMessages.length > lastMessageCount && lastMessageCount > 0) {
            console.log(`New messages detected: ${newMessages.length - lastMessageCount} new message(s)`);
            
            // Show browser notification for new messages
            if (Notification.permission === 'granted') {
              const latestMessage = newMessages[newMessages.length - 1];
              if (latestMessage.message_type === 'Incoming') {
                new Notification(`New message from ${contact.name}`, {
                  body: latestMessage.message_text.substring(0, 100) + (latestMessage.message_text.length > 100 ? '...' : ''),
                  icon: '/favicon.ico',
                  tag: `message-${contact.lead_id}` // Prevent duplicate notifications
                });
              }
            }
            
            // Use silent refresh to avoid blinking effect
            if (onSilentRefresh) {
              onSilentRefresh();
            } else if (onMessageSent) {
              onMessageSent();
            }
          }
          
          setLastMessageCount(newMessages.length);
        }
      } catch (error) {
        console.error('Error checking for new messages:', error);
      }
    };

    // Request notification permission on first load
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('Browser notifications enabled for new messages');
        }
      });
    }

    // Set up polling every 10 seconds
    const pollInterval = setInterval(checkForNewMessages, 10000);

    // Also check immediately when component mounts
    setTimeout(checkForNewMessages, 1000);

    return () => clearInterval(pollInterval);
  }, [contact?.lead_id, messages.length, lastMessageCount, onMessageSent, onSilentRefresh, sending, contact.name]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || sending) return;

    // Get phone number from messages - for outgoing messages, use to_number, for incoming use from_number
    let phoneNumber = '';
    if (messages.length > 0) {
      // Find the most recent incoming message to get the contact's phone number
      const incomingMessage = [...messages].reverse().find(msg => msg.message_type === 'Incoming');
      if (incomingMessage) {
        phoneNumber = incomingMessage.from_number;
      } else {
        // If no incoming messages, use to_number from outgoing messages
        const outgoingMessage = messages.find(msg => msg.message_type === 'Outgoing');
        phoneNumber = outgoingMessage?.to_number || '';
      }
    }
    
    // Get campaign_id from the most recent message if available
    const campaignId = messages.length > 0 ? messages[messages.length - 1].campaign_id : undefined;

    setSending(true);
    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead_id: contact.lead_id,
          message_content: messageText.trim(),
          phone_number: phoneNumber,
          name: contact.name,
          campaign_id: campaignId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessageText(''); // Clear input
        // Call callback to refresh messages
        if (onMessageSent) {
          onMessageSent();
        }
        // Scroll to bottom after sending message
        setTimeout(scrollToBottom, 300);
      } else {
        console.error('Failed to send message:', result.error);
        alert('Failed to send message: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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
    <div className="flex flex-col h-full">
      {/* Header - Fixed at top */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center mr-3">
            <span className="text-gray-600 font-medium">
              {contact.name ? contact.name.charAt(0).toUpperCase() : '?'}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {contact.name || 'Unknown Contact'}
                </h2>
                <p className="text-sm text-gray-500">Lead ID: {contact.lead_id}</p>
              </div>
              <button
                onClick={async () => {
                  if (localUnreadCount === 0) return;
                  setMarkingAsRead(true);
                  try {
                    const unreadMessageIds = messages
                      .filter(msg => !msg.is_read && msg.message_type === 'Incoming')
                      .map(msg => msg.id);

                    if (unreadMessageIds.length === 0) return;

                    const response = await fetch(`/api/messages/${contact.lead_id}/read`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        messageIds: unreadMessageIds
                      }),
                    });

                    if (response.ok) {
                      setLocalUnreadCount(0);
                      if (onMessagesRead) {
                        onMessagesRead();
                      }
                      if (onSilentRefresh) {
                        onSilentRefresh();
                      } else if (onMessageSent) {
                        onMessageSent();
                      }
                    }
                  } catch (error) {
                    console.error('Error marking messages as read:', error);
                  } finally {
                    setMarkingAsRead(false);
                  }
                }}
                disabled={localUnreadCount === 0 || markingAsRead}
                title={markingAsRead 
                  ? 'Marking messages as read...' 
                  : localUnreadCount === 0 
                    ? 'All messages are read' 
                    : `Mark ${localUnreadCount} message${localUnreadCount === 1 ? '' : 's'} as read`}
                className={`ml-4 p-1.5 rounded-lg ${
                  localUnreadCount === 0
                    ? 'bg-gray-100 text-gray-400'
                    : 'hover:bg-gray-100 text-gray-900'
                } transition-colors duration-200`}
              >
                {markingAsRead 
                  ? <Loader2 className="w-5 h-5 animate-spin" /> 
                  : <SquareCheckBig className="w-5 h-5" />}
              </button>
              {/* Removed polling indicator to avoid UI distraction */}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Container - Scrollable */}
      <div className="flex-1 overflow-y-auto bg-gray-50" ref={messagesContainerRef}>
        <div className="p-4 min-h-full flex flex-col">
          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-2">💬</div>
                <p>No messages yet</p>
              </div>
              {/* Invisible element for scroll targeting */}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex-1">
              {groupMessagesByDate(messages || []).map((group) => (
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
                              <pre className={`text-sm whitespace-pre-wrap font-sans ${isOutgoing ? 'text-left' : ''}`}>{message.message_text}</pre>
                              
                              {/* Time and Status in message bubble */}
                              <div className={`flex items-center justify-end mt-2 text-xs ${isOutgoing ? 'text-blue-100' : 'text-gray-500'}`}>
                                <span title={`${isOutgoing ? 'Sent' : 'Received'} at ${formatMessageTime(message.created_date)}`} className="cursor-help">
                                  {formatMessageTime(message.created_date)}
                                </span>
                                {isOutgoing && getStatusIcon(message.status) && (
                                  <span 
                                    className={`ml-1 cursor-help ${getStatusColor(message.status)}`}
                                    title={getStatusText(message.status)}
                                  >
                                    {getStatusIcon(message.status)}
                                  </span>
                                )}
                                {/* Status tooltip for incoming messages */}
                                {!isOutgoing && (
                                  <span 
                                    className={`ml-1 cursor-help ${message.is_read ? 'text-white' : 'text-gray-400'}`}
                                    title={message.is_read ? 'Read by you' : 'Received'}
                                  >
                                    {message.is_read ? '✓✓' : '✓'}
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
              ))}
              {/* Invisible element for scroll targeting */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Message Input - Fixed at bottom */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending}
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50"
          />
          <button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || sending}
            className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {sending ? 'Sending message...' : 'Press Enter to send or click Send button'}
        </p>
      </div>
    </div>
  );
}