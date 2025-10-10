# Message Direction Configuration

To ensure messages are displayed correctly (incoming on left, outgoing on right), the system now uses the `message_type` column from your database.

## Configuration Steps:

### 1. Analyze Your Message Types
1. Go to `/debug` page in your app
2. Click "Analyze Message Types" button
3. This will show you all the message_type values in your database

### 2. Message Direction Logic
The system determines message direction using the `message_type` column:

**Incoming Types** (Left side):
- `incoming`, `received`, `inbound`

**Outgoing Types** (Right side):  
- `outgoing`, `sent`, `outbound`, `template`

**Fallback Rules:**
1. **Has `campaign_id`** → Outgoing
2. **Unknown message_type** → Incoming (safe default)

### 3. Update Message Type Detection (if needed)
If your database uses different message_type values, update the arrays in `MessageView.tsx`:

```tsx
const incomingTypes = ['your_incoming_type', 'another_incoming_type'];
const outgoingTypes = ['your_outgoing_type', 'another_outgoing_type'];
```

### 4. Visual Indicators
- **Incoming messages**: Left side, white background, gray text
- **Outgoing messages**: Right side, blue background, white text
- **Debug indicator**: Shows "← Incoming" or "→ Outgoing" above each message

### 5. Testing
1. Navigate to `/messages`
2. Select a contact
3. Check the direction indicators above each message
4. Use the debug page to analyze your message types if alignment is wrong

### 6. Remove Debug Indicators
Once you confirm messages are showing correctly, remove the debug indicators by commenting out this line in `MessageView.tsx`:

```tsx
{/* Direction indicator for debugging */}
<div className="text-xs text-gray-400 mb-1">
  {isOutgoing ? '→ Outgoing' : '← Incoming'}
</div>
```