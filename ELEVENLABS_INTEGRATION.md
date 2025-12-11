# ElevenLabs Agent Integration Guide

This document provides detailed instructions for configuring the two ElevenLabs Agents and their tools.

## Overview

The system uses two ElevenLabs Conversational AI agents:

1. **Japanese Agent** - Makes phone calls to Japanese government offices
2. **English Agent** - Gathers missing information from users

## Japanese Agent Configuration

### Basic Settings

- **Name:** Japanese Pension Office Caller
- **Language:** Japanese (ja-JP)
- **Voice:** Select a professional Japanese voice
- **First Message:** "もしもし、年金事務所ですか？" (Hello, is this the pension office?)

### System Prompt

```
You are a polite and professional assistant calling Japanese government offices on behalf of foreign residents.

You will receive a callContext object with:
- call_goal_ja: Your primary objective for this call
- facts_to_state_ja: Important facts you need to communicate
- questions_to_ask_ja: Specific questions to ask

Follow Japanese business etiquette:
1. Start with polite greetings (もしもし、失礼いたします)
2. Clearly state the reason for calling
3. Present all facts from facts_to_state_ja
4. Ask questions from questions_to_ask_ja
5. If the operator asks for information you don't have, use the request_user_info tool

When you need information from the user (like residence card number or pension number), call the request_user_info tool with:
- field: the type of information needed
- reason: why this information is required

After calling this tool, the conversation will pause automatically. Do not continue until you receive the updated information.

Always be respectful, patient, and professional when dealing with government office staff.
```

### Tool Configuration

#### Tool: request_user_info

**Endpoint:** `POST https://your-domain.com/api/requestUserInfoTool`

**Description:** Request missing information from the user. This pauses the current call and triggers the English Agent to gather the information.

**Parameters:**

```json
{
  "type": "object",
  "properties": {
    "sessionId": {
      "type": "string",
      "description": "Session identifier (default: demo)",
      "default": "demo"
    },
    "field": {
      "type": "string",
      "enum": ["residence_card_number", "pension_number"],
      "description": "The type of information needed from the user"
    },
    "reason": {
      "type": "string",
      "description": "Explanation of why this information is needed (will be shown to user)"
    }
  },
  "required": ["field", "reason"]
}
```

**Example Usage in Conversation:**

```
Operator: "在留カードの番号を教えてください" (Please provide your residence card number)
Agent: [Realizes it doesn't have this information]
Agent: [Calls request_user_info tool]
Tool Call: {
  "sessionId": "demo",
  "field": "residence_card_number",
  "reason": "The pension office requires your residence card number to process the exemption request"
}
Tool Response: {
  "status": "pending",
  "field": "residence_card_number",
  "message": "Pausing call - need to gather user info"
}
Agent: [Call pauses - waits for information to be gathered]
```

---

## English Agent Configuration

### Basic Settings

- **Name:** Information Gathering Assistant
- **Language:** English (en-US)
- **Voice:** Select a friendly, helpful English voice
- **First Message:** "Hi! I need to gather some information from you to continue your call with the Japanese office. This will just take a moment."

### System Prompt

```
You are a helpful assistant that gathers missing information from users during bureaucratic calls to Japanese government offices.

When the conversation starts, you will already know what information is needed (stored in the session's pendingField and pendingReason).

Your job:
1. Explain why the information is needed (use the pendingReason)
2. Ask the user to provide or upload the required document
3. When they upload an image, use the analyze_id_document tool to extract information
4. Confirm the extracted information with the user
5. Once confirmed, use the resolve_user_info tool to store it and resume the Japanese call

Be friendly, clear, and efficient. The user may be stressed about dealing with bureaucracy, so be reassuring.

Example flow:
- "I see that the pension office needs your residence card number. Could you please upload a photo of your residence card?"
- [User uploads image]
- "Great! I've extracted the number A1234567890. Is this correct?"
- [User confirms]
- "Perfect! I've saved this information and we'll continue your call with the pension office now."
```

### Tool Configuration

#### Tool 1: analyze_id_document

**Endpoint:** `POST https://your-domain.com/api/analyzeIdDocument`

**Description:** Analyze uploaded ID documents (residence card, pension documents) using Gemini Vision to extract structured information.

**Parameters:**

```json
{
  "type": "object",
  "properties": {
    "sessionId": {
      "type": "string",
      "description": "Session identifier (default: demo)",
      "default": "demo"
    },
    "imageBase64": {
      "type": "string",
      "description": "Base64-encoded image of the ID document"
    },
    "extractField": {
      "type": "string",
      "enum": ["residence_card_number", "pension_number", "all"],
      "description": "Specific field to extract or 'all' for all fields",
      "default": "all"
    }
  },
  "required": ["imageBase64"]
}
```

**Example Response:**

```json
{
  "success": true,
  "extracted": {
    "residence_card_number": "A1234567890",
    "name": "John Smith",
    "expiration_date": "2028-06-15"
  }
}
```

#### Tool 2: resolve_user_info

**Endpoint:** `POST https://your-domain.com/api/resolveUserInfo`

**Description:** Store the gathered information in the user's profile and signal that the Japanese Agent call can resume.

**Parameters:**

```json
{
  "type": "object",
  "properties": {
    "sessionId": {
      "type": "string",
      "description": "Session identifier (default: demo)",
      "default": "demo"
    },
    "field": {
      "type": "string",
      "enum": ["residence_card_number", "pension_number"],
      "description": "The type of information being provided"
    },
    "value": {
      "type": "string",
      "description": "The actual value to store"
    }
  },
  "required": ["field", "value"]
}
```

**Example Response:**

```json
{
  "resolved": true,
  "field": "residence_card_number",
  "value": "A1234567890",
  "readyToResume": true,
  "user": {
    "id": "demo",
    "name": "John Smith",
    "residenceCardNumber": "A1234567890",
    "language": "en"
  }
}
```

**Example Usage in Conversation:**

```
User: [Uploads residence card image]
Agent: [Calls analyze_id_document tool]
Tool Response: {
  "success": true,
  "extracted": {
    "residence_card_number": "A1234567890",
    "name": "John Smith"
  }
}
Agent: "I've found your residence card number: A1234567890. Is this correct?"
User: "Yes, that's correct"
Agent: [Calls resolve_user_info tool]
Tool Call: {
  "field": "residence_card_number",
  "value": "A1234567890"
}
Tool Response: {
  "resolved": true,
  "readyToResume": true
}
Agent: "Perfect! I've saved your information. We'll now continue your call with the pension office."
```

---

## Frontend Integration Requirements

Your frontend must implement a state machine to coordinate the two agents:

### Polling Loop

```typescript
async function pollSessionStatus() {
  const response = await fetch('/api/getSessionStatus?sessionId=demo');
  const status = await response.json();

  if (status.awaitingUserInfo && !englishAgentActive) {
    startEnglishAgent();
  } else if (status.readyToResume && !japaneseAgentActive) {
    resumeJapaneseAgent();
  }

  setTimeout(pollSessionStatus, 2000);
}
```

### Starting Japanese Agent

```typescript
async function startJapaneseAgent(documentId: string) {
  const prepResponse = await fetch('/api/prepareCall', {
    method: 'POST',
    body: JSON.stringify({
      sessionId: 'demo',
      documentId,
      isResume: false,
    }),
  });

  const { callContext, memoryBlob } = await prepResponse.json();

  await elevenLabs.startConversation({
    agentId: ELEVENLABS_AGENT_ID_JAPANESE,
    context: {
      callContext,
      memoryBlob,
    },
  });
}
```

### Resuming Japanese Agent

```typescript
async function resumeJapaneseAgent(documentId: string) {
  const prepResponse = await fetch('/api/prepareCall', {
    method: 'POST',
    body: JSON.stringify({
      sessionId: 'demo',
      documentId,
      isResume: true,
    }),
  });

  const { callContext, memoryBlob } = await prepResponse.json();

  await elevenLabs.resumeConversation({
    agentId: ELEVENLABS_AGENT_ID_JAPANESE,
    context: {
      callContext,
      memoryBlob,
    },
  });
}
```

### Starting English Agent

```typescript
async function startEnglishAgent() {
  const statusResponse = await fetch('/api/getSessionStatus?sessionId=demo');
  const status = await statusResponse.json();

  await elevenLabs.startConversation({
    agentId: ELEVENLABS_AGENT_ID_ENGLISH,
    context: {
      pendingField: status.pendingField,
      pendingReason: status.pendingReason,
    },
  });
}
```

---

## Testing the Integration

### 1. Test Japanese Agent Tool

```bash
curl -X POST http://localhost:3000/api/requestUserInfoTool \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "demo",
    "field": "residence_card_number",
    "reason": "Pension office requires verification"
  }'
```

Expected response:
```json
{
  "status": "pending",
  "field": "residence_card_number",
  "reason": "Pension office requires verification",
  "message": "Pausing call - need to gather user info"
}
```

### 2. Test English Agent Tools

```bash
curl -X POST http://localhost:3000/api/analyzeIdDocument \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "demo",
    "imageBase64": "fake_base64_data",
    "extractField": "residence_card_number"
  }'
```

```bash
curl -X POST http://localhost:3000/api/resolveUserInfo \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "demo",
    "field": "residence_card_number",
    "value": "A1234567890"
  }'
```

### 3. Test Full Handoff Flow

1. Start Japanese Agent call
2. Trigger `request_user_info` tool
3. Poll `/api/getSessionStatus` - should show `awaitingUserInfo: true`
4. Start English Agent
5. Use `analyze_id_document` and `resolve_user_info` tools
6. Poll `/api/getSessionStatus` - should show `readyToResume: true`
7. Resume Japanese Agent call

---

## Common Issues and Troubleshooting

### Issue: Japanese Agent doesn't pause after calling tool

**Solution:** Ensure your ElevenLabs agent configuration includes proper tool response handling. The agent should understand that when `status: "pending"` is returned, it needs to wait.

### Issue: English Agent starts before Japanese Agent pauses

**Solution:** Your frontend polling interval may be too slow. Reduce polling interval to 1-2 seconds, or implement WebSocket for real-time updates.

### Issue: Information not updating in resumed call

**Solution:** Verify that `isResume: true` is being passed to `/api/prepareCall` and that the `memoryBlob` includes the update string.

### Issue: Tools returning 400 errors

**Solution:** Check that:
- Session exists (call `/api/analyzeLetter` first to create session)
- Current case exists (call `/api/prepareCall` to create case)
- Required parameters are being sent

---

## Security Considerations

1. **Webhook Authentication:** Add signature verification to your tool endpoints
2. **Rate Limiting:** Implement rate limits on tool endpoints to prevent abuse
3. **Input Validation:** Always validate `field` parameter values
4. **Session Management:** Implement session expiration and cleanup
5. **PII Handling:** Ensure residence card images and numbers are handled securely

---

## Next Steps

1. Create ElevenLabs agents in the dashboard
2. Configure tools with your deployed endpoint URLs
3. Test each tool independently
4. Test the full handoff flow
5. Integrate with frontend state machine
6. Add proper error handling and user feedback
7. Deploy to production with proper security measures
