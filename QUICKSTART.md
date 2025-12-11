# Quickstart Guide

Get the Japanese Bureaucracy Assistant backend running in 5 minutes.

## Prerequisites

- Node.js 18+ and npm
- Basic understanding of REST APIs
- (Optional) Google Cloud account for Gemini Vision
- (Optional) OpenAI account for LLM
- (Optional) ElevenLabs account for voice agents

## Step 1: Install Dependencies

```bash
npm install
```

Expected output: ~420 packages installed

## Step 2: Verify Build

```bash
npm run build
```

Expected output: ✓ Compiled successfully with 10 API routes

## Step 3: Start Development Server

```bash
npm run dev
```

Server starts at: http://localhost:3000

## Step 4: Test API Endpoints

### Option A: Quick Test (Manual)

```bash
# Test 1: Analyze a document
curl -X POST http://localhost:3000/api/analyzeLetter \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test", "imageBase64": "fake_image_data"}'

# Expected: JSON with document analysis (stubbed data)
```

### Option B: Full Test (Automated)

```bash
# Save the test script from API_TESTING.md
chmod +x test-api.sh
./test-api.sh
```

Expected: All 10 tests pass with green output

### Option C: Example Client

```bash
npm install -g tsx
tsx example-client.ts
```

Expected: Complete workflow demonstration with console output

## Step 5: Explore API

Visit: http://localhost:3000

You'll see a list of all available API endpoints.

## Architecture Overview

```
┌─────────────┐
│   Frontend  │
│  (To Build) │
└──────┬──────┘
       │ HTTP Requests
       ▼
┌─────────────────────────────┐
│    Backend API (This)       │
│  ┌───────────────────────┐  │
│  │  9 REST Endpoints     │  │
│  │  - Document analysis  │  │
│  │  - Profile mgmt       │  │
│  │  - Call preparation   │  │
│  │  - Agent tools        │  │
│  │  - Status polling     │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │  Session Store        │  │
│  │  (In-Memory)          │  │
│  └───────────────────────┘  │
└──────┬──────────────┬───────┘
       │              │
       ▼              ▼
┌─────────────┐ ┌─────────────┐
│   Gemini    │ │     LLM     │
│   Vision    │ │  (OpenAI)   │
│  (Stubbed)  │ │  (Stubbed)  │
└─────────────┘ └─────────────┘
       │              │
       ▼              ▼
┌──────────────────────────────┐
│     ElevenLabs Agents        │
│  ┌────────────────────────┐  │
│  │  Japanese Agent        │  │
│  │  (Phone Caller)        │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │  English Agent         │  │
│  │  (Info Gatherer)       │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

## Understanding the Flow

### 1. Document Upload Phase

User uploads Japanese letter → Backend analyzes with Gemini → Returns structured data

**Test it:**
```bash
curl -X POST http://localhost:3000/api/analyzeLetter \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "demo", "imageBase64": "test"}'
```

### 2. Profile Building Phase

User answers questions → Backend updates profile incrementally

**Test it:**
```bash
curl -X POST http://localhost:3000/api/updateUserProfile \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "demo", "patch": {"name": "John", "country": "UK"}}'
```

### 3. Call Preparation Phase

Backend generates Japanese context for agent

**Test it:**
```bash
curl -X POST http://localhost:3000/api/prepareCall \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "demo", "documentId": "doc_1", "isResume": false}'
```

### 4. Call Execution Phase (Two-Agent Handoff)

This is where the magic happens:

a) Japanese Agent calls pension office
b) Office asks for info agent doesn't have
c) Japanese Agent calls `request_user_info` tool → **PAUSE**
d) Frontend detects pause (polls `getSessionStatus`)
e) English Agent starts, asks user for document
f) English Agent analyzes document, calls `resolve_user_info` tool
g) Frontend detects resume signal
h) Japanese Agent **RESUMES** with new info
i) Call completes

**Test the handoff:**
```bash
# Step 1: Japanese Agent needs info
curl -X POST http://localhost:3000/api/requestUserInfoTool \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "demo", "field": "residence_card_number", "reason": "Verification needed"}'

# Step 2: Check status (should show awaitingUserInfo: true)
curl http://localhost:3000/api/getSessionStatus?sessionId=demo

# Step 3: English Agent analyzes ID
curl -X POST http://localhost:3000/api/analyzeIdDocument \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "demo", "imageBase64": "test", "extractField": "residence_card_number"}'

# Step 4: English Agent resolves info
curl -X POST http://localhost:3000/api/resolveUserInfo \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "demo", "field": "residence_card_number", "value": "A1234567890"}'

# Step 5: Check status (should show readyToResume: true)
curl http://localhost:3000/api/getSessionStatus?sessionId=demo
```

### 5. Summarization Phase

After call completes, generate summary

**Test it:**
```bash
curl -X POST http://localhost:3000/api/summarizeCall \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "demo", "transcript": "Call transcript here..."}'
```

## Key Concepts

### Sessions

Each user interaction creates a session identified by `sessionId`. Sessions contain:
- User profile
- Analyzed documents
- Current case state

### State Flags

The system uses flags to coordinate agents:

- `awaitingUserInfo: true` → Start English Agent
- `readyToResume: true` → Resume Japanese Agent
- `pendingField` → What info is needed
- `pendingReason` → Why (shown to user)

### Frontend Polling

Your frontend should poll `/api/getSessionStatus` every 2-3 seconds to detect state changes:

```typescript
setInterval(async () => {
  const response = await fetch('/api/getSessionStatus?sessionId=demo');
  const status = await response.json();

  if (status.awaitingUserInfo) {
    startEnglishAgent();
  }
  if (status.readyToResume) {
    resumeJapaneseAgent();
  }
}, 2000);
```

## Next Steps

### 1. Wire AI Services (Required for Production)

**Gemini Vision API:**
- Update `app/api/analyzeLetter/route.ts`
- Update `app/api/analyzeIdDocument/route.ts`
- See: [Google Cloud AI Platform docs](https://cloud.google.com/vertex-ai/docs)

**LLM API (OpenAI/Claude):**
- Update `app/api/prepareCall/route.ts`
- Update `app/api/summarizeCall/route.ts`
- See: [OpenAI docs](https://platform.openai.com/docs)

### 2. Configure ElevenLabs Agents

**Full guide:** See `ELEVENLABS_INTEGRATION.md`

Quick steps:
1. Create Japanese Agent in ElevenLabs dashboard
2. Add system prompt (see guide)
3. Configure tool: `POST /api/requestUserInfoTool`
4. Create English Agent
5. Add system prompt (see guide)
6. Configure tools: `POST /api/analyzeIdDocument`, `POST /api/resolveUserInfo`
7. Update `.env` with agent IDs

### 3. Build Frontend

Your frontend needs:
- Document upload UI
- Profile form
- Status polling logic
- ElevenLabs agent integration
- Call status indicators

**Frontend integration code:** See `ELEVENLABS_INTEGRATION.md` Section "Frontend Integration Requirements"

### 4. Production Hardening

**Session Storage:**
Current: In-memory (resets on restart)
Production: Redis or database

**Authentication:**
Add JWT or session tokens to API endpoints

**Rate Limiting:**
Prevent abuse of Gemini and LLM calls

**Error Handling:**
Add retry logic and user-friendly errors

**Monitoring:**
Add logging for all state transitions

## Common Issues

### Issue: "No active case" error

**Solution:** You must call `/api/prepareCall` after analyzing a document and before calling info-related endpoints.

### Issue: Session data disappears

**Solution:** In-memory storage resets when you restart the dev server. For persistence, implement Redis/database storage.

### Issue: CORS errors from frontend

**Solution:** Configure CORS in `next.config.js`:

```javascript
async headers() {
  return [
    {
      source: "/api/:path*",
      headers: [
        { key: "Access-Control-Allow-Origin", value: "*" },
        { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
        { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
      ],
    },
  ];
}
```

## Documentation Reference

- **README.md** - Complete API reference and overview
- **ELEVENLABS_INTEGRATION.md** - Detailed ElevenLabs setup guide
- **SESSION_FLOW.md** - State machine and workflow documentation
- **API_TESTING.md** - Comprehensive testing guide
- **PROJECT_SUMMARY.md** - High-level project overview
- **example-client.ts** - Working example code

## Support

For issues or questions:
1. Check the relevant documentation above
2. Review error messages in API responses
3. Check console logs during development
4. Refer to Next.js docs for framework issues

## Development Tips

### Hot Reload

Changes to API routes automatically reload. No need to restart server.

### Debugging

Add console.log in API routes to debug:

```typescript
export async function POST(req: NextRequest) {
  const body = await req.json();
  console.log('Request body:', body);
  // ... rest of code
}
```

View logs in terminal where `npm run dev` is running.

### Testing with Postman

Import the Postman collection from `API_TESTING.md` for easier testing.

### VS Code Setup

Recommended extensions:
- ESLint
- Prettier
- TypeScript and JavaScript Language Features

## Performance

Expected response times (stubbed data):
- Document analysis: <100ms
- Profile update: <50ms
- Status check: <50ms
- Call preparation: <100ms

With real AI services:
- Document analysis: 1-3s (Gemini)
- Call preparation: 2-5s (LLM)
- ID analysis: 1-2s (Gemini)
- Summarization: 3-7s (LLM)

## Scaling Considerations

For production with many concurrent users:

1. **Horizontal Scaling:** Add load balancer + multiple server instances
2. **Session Store:** Use Redis Cluster for shared session state
3. **API Rate Limiting:** Implement per-user rate limits
4. **Caching:** Cache LLM-generated Japanese contexts for common scenarios
5. **Queue System:** Queue AI requests to prevent API overload

---

**You're Ready!** The backend is fully functional with stubbed AI services. Start integrating with real services and building your frontend.
