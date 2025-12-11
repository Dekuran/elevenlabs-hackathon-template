# Real-Time Streaming Setup Guide

Complete guide for setting up real-time transcription and translation streaming with Pusher (Vercel-compatible).

## Architecture Overview

```
┌─────────────┐
│  ElevenLabs │ WebSocket
│   Agent     │────────────┐
└─────────────┘            │
                           ▼
                    ┌──────────────┐
                    │   Backend    │
                    │  (Serverless)│
                    │              │
                    │ • Receives   │
                    │ • Translates │
                    │ • Publishes  │
                    └──────┬───────┘
                           │ Pusher
                           ▼
                    ┌──────────────┐
                    │   Frontend   │
                    │              │
                    │ • Subscribes │
                    │ • Displays   │
                    └──────────────┘
```

## Why Pusher?

Vercel doesn't support persistent WebSocket connections in serverless functions. Pusher solves this by:

1. **Backend** maintains WebSocket to ElevenLabs (short-lived, 5 min max)
2. **Pusher** broadcasts events to all connected clients
3. **Frontend** receives events via Pusher (client-side WebSocket)

**Benefits:**
- Works on Vercel's serverless platform
- Scales automatically
- Free tier: 100 concurrent connections, 200k messages/day
- No infrastructure management needed

## Setup Steps

### 1. Sign Up for Pusher

1. Go to [https://pusher.com](https://pusher.com)
2. Create a free account
3. Create a new Channels app
4. Note these credentials from your dashboard:
   - **App ID**: `123456`
   - **Key**: `abc123key` (public, safe for frontend)
   - **Secret**: `xyz789secret` (private, server-only)
   - **Cluster**: `us2` (or `eu`, `ap1` based on region)

### 2. Configure Environment Variables

Add to `.env.local`:

```bash
# Pusher Credentials
PUSHER_APP_ID=your-app-id-here
PUSHER_SECRET=your-secret-here
NEXT_PUBLIC_PUSHER_KEY=your-key-here
NEXT_PUBLIC_PUSHER_CLUSTER=us2

# Google Cloud (for translation)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json

# ElevenLabs
ELEVENLABS_API_KEY=your-elevenlabs-api-key
ELEVENLABS_AGENT_ID_JAPANESE=agt_xxxxx
```

### 3. Google Cloud Translation Setup

1. **Create GCP Project:**
   - Go to [console.cloud.google.com](https://console.cloud.google.com)
   - Create new project
   - Note the project ID

2. **Enable Translation API:**
   - Go to APIs & Services → Library
   - Search for "Cloud Translation API"
   - Click "Enable"

3. **Create Service Account:**
   - Go to IAM & Admin → Service Accounts
   - Click "Create Service Account"
   - Name: `translation-service`
   - Role: `Cloud Translation API User`
   - Click "Create Key" → JSON
   - Download `service-account.json`
   - Place in project root

4. **Update Environment:**
   ```bash
   GOOGLE_CLOUD_PROJECT_ID=your-actual-project-id
   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
   ```

### 4. Install Dependencies

```bash
npm install
```

This installs:
- `pusher` - Server-side Pusher SDK
- `pusher-js` - Client-side Pusher SDK
- `@google-cloud/translate` - Google Cloud Translation
- `ws` - WebSocket client for ElevenLabs

### 5. Test Locally

```bash
npm run dev
```

Visit: `http://localhost:3000/stream-test`

## How It Works

### Backend Flow (`app/api/startStream/route.ts`)

1. **Client calls** `/api/startStream` with `conversationId`
2. **Backend connects** to ElevenLabs WebSocket
3. **Backend receives** audio + transcript events
4. **Backend translates** Japanese text to English (Google Translate)
5. **Backend publishes** to Pusher channel
6. **Frontend receives** events via Pusher subscription

### Event Types

#### Transcript Event
```typescript
{
  speaker: "agent" | "operator",
  text_ja: "こんにちは、年金事務所です",
  text_en: "Hello, this is the pension office",
  is_final: true,
  timestamp: 1234567890
}
```

#### Status Event
```typescript
{
  status: "connected" | "active" | "ended",
  timestamp: 1234567890
}
```

#### Audio Event
```typescript
{
  data: "base64_audio_data",
  timestamp: 1234567890
}
```

### Frontend Usage

```typescript
import { CallStreamClient } from '@/lib/callStream';

const client = new CallStreamClient(
  conversationId,
  sessionId,
  {
    onTranscript: (msg) => {
      console.log(`${msg.speaker}: ${msg.text_ja} → ${msg.text_en}`);
    },
    onStatus: (msg) => {
      console.log('Status:', msg.status);
    },
    onError: (error) => {
      console.error('Error:', error);
    }
  }
);

// Later:
await client.disconnect();
```

## Testing the Stream

### Option 1: Stream Test UI

1. Start dev server: `npm run dev`
2. Visit: `http://localhost:3000/stream-test`
3. Enter conversation ID from ElevenLabs
4. Click "Start Stream"
5. Watch live transcripts appear

### Option 2: Manual Testing

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Start stream
curl -X POST http://localhost:3000/api/startStream \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "conv_xxxxx",
    "sessionId": "demo"
  }'

# Terminal 3: Stop stream
curl -X POST http://localhost:3000/api/stopStream \
  -H "Content-Type: application/json" \
  -d '{"conversationId": "conv_xxxxx"}'
```

### Option 3: Browser Console

```javascript
// Open browser console at http://localhost:3000/stream-test
const Pusher = require('pusher-js');
const pusher = new Pusher('your-key', { cluster: 'us2' });
const channel = pusher.subscribe('conversation-conv_xxxxx');

channel.bind('transcript', (data) => {
  console.log('Transcript:', data);
});

channel.bind('status', (data) => {
  console.log('Status:', data);
});
```

## Vercel Deployment

### 1. Install Vercel CLI

```bash
npm i -g vercel
```

### 2. Link Project

```bash
vercel link
```

### 3. Add Environment Variables

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add all variables from `.env.local`:
- `PUSHER_APP_ID`
- `PUSHER_SECRET`
- `NEXT_PUBLIC_PUSHER_KEY`
- `NEXT_PUBLIC_PUSHER_CLUSTER`
- `GOOGLE_CLOUD_PROJECT_ID`
- `GOOGLE_APPLICATION_CREDENTIALS` (paste JSON content)
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_AGENT_ID_JAPANESE`
- `OPENAI_API_KEY`

### 4. Deploy

```bash
vercel --prod
```

### 5. Verify

Visit: `https://your-app.vercel.app/stream-test`

## Configuration

### Pusher Limits (Free Tier)

- **100 concurrent connections**
- **200,000 messages/day**
- **10,000 requests/day**
- **1 app**

For production with more users, upgrade to paid plan.

### Function Timeout

Vercel limits:
- **Hobby**: 10 seconds
- **Pro**: 300 seconds (5 minutes)

If calls exceed 5 minutes:
1. Upgrade to Pro
2. Implement session resumption
3. Use Edge Functions (no timeout but limited APIs)

### Translation Costs

Google Cloud Translation:
- **Free tier**: $0 - 500,000 characters/month
- **After**: $20 per million characters

Average call: ~1000 characters = $0.02

## Troubleshooting

### Error: "Pusher connection failed"

**Check:**
1. Pusher credentials in `.env`
2. `NEXT_PUBLIC_PUSHER_KEY` starts with `NEXT_PUBLIC_`
3. Cluster matches your Pusher app

**Fix:**
```bash
# Verify credentials
echo $NEXT_PUBLIC_PUSHER_KEY
echo $NEXT_PUBLIC_PUSHER_CLUSTER
```

### Error: "Translation unavailable"

**Check:**
1. Google Cloud Translation API enabled
2. Service account JSON valid
3. Project ID correct

**Fix:**
```bash
# Test translation API
curl -X POST "https://translation.googleapis.com/language/translate/v2" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "q": "こんにちは",
    "target": "en"
  }'
```

### Error: "WebSocket connection failed"

**Check:**
1. ElevenLabs API key valid
2. Conversation ID exists and active
3. Network allows WebSocket connections

**Fix:**
```bash
# Test ElevenLabs API
curl "https://api.elevenlabs.io/v1/convai/agents" \
  -H "xi-api-key: $ELEVENLABS_API_KEY"
```

### No messages appearing

**Check:**
1. Pusher channel name correct: `conversation-{conversationId}`
2. Backend stream started successfully
3. Frontend subscribed to correct channel
4. Browser console for errors

**Debug:**
```javascript
// In browser console
pusher.connection.bind('state_change', (states) => {
  console.log('Pusher state:', states.current);
});
```

### Function timeout on Vercel

**Issue:** Function times out after 10 seconds (Hobby plan)

**Solutions:**
1. Upgrade to Pro plan (300s timeout)
2. Use Edge Functions
3. Implement stream chunking

## Architecture Decisions

### Why not Server-Sent Events (SSE)?

SSE requires persistent connection, same issue as WebSockets on Vercel.

### Why not polling?

Polling adds latency (2-3 second delay) and wastes bandwidth. Real-time transcription needs <100ms latency.

### Why not socket.io?

socket.io requires persistent server, not compatible with serverless.

### Why Pusher specifically?

- Works with serverless (no persistent server needed)
- Generous free tier
- Battle-tested reliability
- Easy to use API
- Good documentation

## Advanced Features

### Audio Playback

```typescript
onAudio: (msg) => {
  const audio = new Audio(`data:audio/mp3;base64,${msg.data}`);
  audio.play();
}
```

### Transcript Export

```typescript
const exportTranscript = () => {
  const text = messages
    .map(m => `${m.speaker}: ${m.text_ja}\n${m.text_en}\n`)
    .join('\n');

  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transcript.txt';
  a.click();
};
```

### Multi-language Support

```typescript
const translate = new translateV2.Translate();

// Translate to multiple languages
const [translations] = await translate.translate(text, {
  from: 'ja',
  to: ['en', 'es', 'fr'],
});
```

## Performance Optimization

### Reduce Translation Costs

Only translate final transcripts:
```typescript
if (isFinal && textJa?.trim()) {
  const textEn = await translateWithGoogle(textJa);
  // ...
}
```

### Batch Translations

```typescript
const pendingTranslations: string[] = [];
setInterval(async () => {
  if (pendingTranslations.length > 0) {
    const translations = await translate.translate(pendingTranslations, {
      from: 'ja',
      to: 'en',
    });
    // Process batch
  }
}, 1000);
```

### Connection Pooling

Reuse WebSocket connections:
```typescript
const connectionPool = new Map<string, WebSocket>();

function getOrCreateConnection(conversationId: string) {
  if (connectionPool.has(conversationId)) {
    return connectionPool.get(conversationId);
  }
  // Create new connection
}
```

## Security Best Practices

1. **Never expose Pusher secret** in frontend
2. **Validate conversation IDs** before streaming
3. **Rate limit** stream start requests
4. **Authenticate users** before allowing streams
5. **Sanitize** all transcript data before display

## Next Steps

1. Add authentication to stream endpoints
2. Implement session recording and playback
3. Add sentiment analysis to transcripts
4. Build dashboard for call analytics
5. Add webhook for call completion notifications

## Support

- **Pusher Docs**: https://pusher.com/docs
- **Google Cloud Translation**: https://cloud.google.com/translate/docs
- **ElevenLabs API**: https://elevenlabs.io/docs

For issues, check the troubleshooting section above or review backend logs in Vercel dashboard.
