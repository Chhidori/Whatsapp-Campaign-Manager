# WhatsApp Messages Feature

## Overview
The Messages feature provides a WhatsApp-like interface to view message history between your system and contacts. This feature includes:

- **Contact List**: Shows all contacts with their latest message and unread count
- **Message History**: Displays conversations in a chat-like interface
- **Message Status**: Shows delivery status (sent, delivered, read, failed)
- **Auto-read**: Messages are marked as read when a contact is selected

## Page Structure

### `/messages` - Main Messages Page
- Split layout with contacts on the left and message history on the right
- Real-time-like interface similar to WhatsApp Web

### Components Created

1. **`ContactList.tsx`**
   - Displays all contacts with their latest message
   - Shows unread message count badges
   - Contact avatars with initials
   - Time stamps for last messages

2. **`MessageView.tsx`**
   - WhatsApp-style message bubbles
   - Incoming messages on the left (white background)
   - Outgoing messages on the right (blue background)
   - Message status indicators
   - Timestamp display
   - Message type indicators for non-text messages

### Database Schema Used

#### `whatsapp_campaign.wa_contacts`
- `name`: Contact name
- `lead_id`: Unique identifier for the contact

#### `whatsapp_campaign.wa_message_history`
- `id`: Message ID
- `message_id`: WhatsApp message ID
- `from_number`: Sender phone number
- `to_number`: Recipient phone number
- `message_text`: Message content
- `message_type`: Type of message (text, image, document, etc.)
- `status`: Message status (sent, delivered, read, failed)
- `lead_id`: Associated contact ID
- `is_read`: Read status
- `created_date`: Message timestamp
- `campaign_id`: Associated campaign (optional)

## API Endpoints

### `GET /api/contacts`
Returns all contacts with their latest message and unread count.

### `GET /api/messages/[leadId]`
Returns all messages for a specific contact.

### `PUT /api/messages/[leadId]/read`
Marks messages as read for a specific contact.

## Sample Data
The system includes sample data for testing when no real database data is available. This allows you to see the interface working immediately.

## Features

### Message Direction Detection
Messages are automatically classified as incoming or outgoing based on:
- System phone numbers configured in the code
- Message sender/recipient analysis

### Status Indicators
- ✓ Sent
- ✓✓ Delivered  
- ✓✓ Read (blue color)
- ✗ Failed (red color)

### Responsive Design
- Desktop: Side-by-side layout
- Mobile: Full-screen views with navigation

## Usage

1. Navigate to `/messages` in your application
2. Click on any contact in the left sidebar
3. View the conversation history on the right
4. Messages are automatically marked as read when viewed

## Future Enhancements

- Real-time message updates using WebSocket
- Message sending capability
- File/media message support
- Message search functionality
- Contact search and filtering
- Export conversation history