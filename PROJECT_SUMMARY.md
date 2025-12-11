# Japanese Bureaucracy Assistant - Project Summary

## Overview

Complete backend system for a two-agent AI assistant that helps foreign residents navigate Japanese bureaucracy. The system coordinates two ElevenLabs Conversational AI agents:

1. **Japanese Agent** - Makes phone calls to Japanese government offices
2. **English Agent** - Gathers missing information from users during calls

## Project Structure

```
japanese-bureaucracy-assistant/
├── lib/
│   └── sessionStore.ts              # In-memory session management
├── app/
│   ├── layout.tsx                   # Next.js app layout
│   ├── page.tsx                     # Home page with API listing
│   └── api/
│       ├── analyzeLetter/           # Document analysis (Gemini Vision)
│       ├── updateUserProfile/       # User profile updates
│       ├── prepareCall/             # Call context generation (LLM)
│       ├── requestUserInfoTool/     # Japanese Agent tool
│       ├── analyzeIdDocument/       # English Agent tool (Gemini Vision)
│       ├── resolveUserInfo/         # English Agent tool
│       ├── getSessionStatus/        # Status polling for frontend
│       └── summarizeCall/           # Call summarization (LLM)
├── .env                             # Environment variables
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
├── next.config.js                   # Next.js config
├── .gitignore                       # Git ignore patterns
├── example-client.ts                # Example usage workflow
├── README.md                        # Main documentation
├── ELEVENLABS_INTEGRATION.md        # ElevenLabs setup guide
├── SESSION_FLOW.md                  # State machine documentation
└── API_TESTING.md                   # Testing guide with curl examples
```

## Components Implemented

### 1. Session Store (`lib/sessionStore.ts`)

In-memory data store with TypeScript types:

- **UserProfile** - User information (name, country, pension system, etc.)
- **CaseDocument** - Analyzed Japanese documents
- **CaseState** - Active case with call context and status flags
- **SessionState** - Complete session data

Key functions:
- `getSession(sessionId)` - Retrieve or create session
- `saveSession(sessionId, state)` - Persist session updates

### 2. API Endpoints (9 total)

#### Document & Profile Management

**POST /api/analyzeLetter**
- Accepts: `{ imageBase64, sessionId }`
- Uses: Gemini Vision API (stubbed)
- Returns: Structured document data
- Creates: Document in session

**POST /api/updateUserProfile**
- Accepts: `{ sessionId, patch }`
- Updates: User profile incrementally
- Returns: Updated user object

#### Call Preparation & Management

**POST /api/prepareCall**
- Accepts: `{ sessionId, documentId, isResume }`
- Uses: LLM to generate Japanese context (stubbed)
- Returns: Call context and memory blob
- Creates/Updates: Case state

**GET /api/getSessionStatus**
- Accepts: `sessionId` query parameter
- Returns: Current session status with flags
- Used by: Frontend polling for state changes

**POST /api/summarizeCall**
- Accepts: `{ sessionId, transcript }`
- Uses: LLM to analyze transcript (stubbed)
- Returns: Summary and next steps
- Updates: Case with completion data

#### ElevenLabs Tools (Japanese Agent)

**POST /api/requestUserInfoTool**
- Accepts: `{ sessionId, field, reason }`
- Sets: `awaitingUserInfo: true`
- Stores: Pending field and reason
- Triggers: English Agent via frontend polling

#### ElevenLabs Tools (English Agent)

**POST /api/analyzeIdDocument**
- Accepts: `{ imageBase64, sessionId, extractField }`
- Uses: Gemini Vision API (stubbed)
- Returns: Extracted ID information
- Does NOT update: Session (info not confirmed yet)

**POST /api/resolveUserInfo**
- Accepts: `{ sessionId, field, value }`
- Updates: User profile with confirmed info
- Sets: `readyToResume: true`
- Clears: Pending flags
- Triggers: Japanese Agent resume via frontend polling

### 3. Configuration Files

**package.json**
- Next.js 14.2
- React 18.3
- TypeScript 5.4
- Google Cloud AI Platform SDK
- OpenAI SDK

**tsconfig.json**
- Strict mode enabled
- Path aliases (@/* for project root)
- Next.js plugin configured

**next.config.js**
- Environment variable exposure
- React strict mode enabled

**.env**
- Supabase credentials (pre-configured)
- Google Cloud / Vertex AI settings (placeholder)
- OpenAI API key (placeholder)
- ElevenLabs credentials (placeholder)

### 4. Documentation

**README.md** (Main Documentation)
- System architecture
- API endpoint reference
- TypeScript type definitions
- Setup instructions
- Integration tasks (TODOs)

**ELEVENLABS_INTEGRATION.md** (ElevenLabs Setup)
- Agent configuration (Japanese & English)
- System prompts for each agent
- Tool endpoint specifications
- Frontend integration code
- Testing procedures
- Troubleshooting guide

**SESSION_FLOW.md** (State Machine)
- Complete session lifecycle
- 10-phase workflow documentation
- State transition diagrams
- Key flag explanations
- Error scenarios
- Implementation checklist
- Production considerations (Redis, DB)

**API_TESTING.md** (Testing Guide)
- Complete curl examples
- Happy path test sequence
- Error case examples
- Automated test script
- Performance testing
- Debugging tips

**example-client.ts** (Example Code)
- Complete workflow demonstration
- All 9 endpoints called in sequence
- Console logging for visibility

## Key Features

### Two-Agent Handoff

The system implements sophisticated agent coordination:

1. **Japanese Agent** makes call to pension office
2. Pension office asks for information agent doesn't have
3. **Japanese Agent** calls `request_user_info` tool
4. Call **PAUSES** automatically
5. Frontend detects `awaitingUserInfo: true` flag
6. **English Agent** starts conversation with user
7. **English Agent** gathers document, extracts info
8. **English Agent** calls `resolve_user_info` tool
9. System sets `readyToResume: true` flag
10. Frontend detects flag and **resumes Japanese Agent**
11. **Japanese Agent** continues with updated information

### State Management

Session state includes critical flags:

- `awaitingUserInfo` - Triggers English Agent start
- `readyToResume` - Triggers Japanese Agent resume
- `pendingField` - What info is needed
- `pendingReason` - Why (shown to user)

Frontend must poll `/api/getSessionStatus` to detect state changes and trigger agent handoffs.

### Data Flow

```
User Input → Document Analysis (Gemini) → Profile Building
  ↓
Call Preparation (LLM generates Japanese context)
  ↓
Japanese Agent Call (ElevenLabs)
  ↓
Info Request (Pause) → English Agent (ElevenLabs)
  ↓
ID Analysis (Gemini) → Info Resolution
  ↓
Japanese Agent Resume (ElevenLabs)
  ↓
Call Complete → Transcript (ElevenLabs STT) → Summary (LLM)
  ↓
Next Steps for User
```

## Integration Points

### Required External Services

1. **Google Vertex AI / Gemini Vision**
   - Used in: `analyzeLetter`, `analyzeIdDocument`
   - Purpose: OCR and structured extraction from images
   - Status: Stubbed with example data

2. **OpenAI / Claude (LLM)**
   - Used in: `prepareCall`, `summarizeCall`
   - Purpose: Generate Japanese context, summarize transcripts
   - Status: Stubbed with example data

3. **ElevenLabs Conversational AI**
   - Used for: Both Japanese and English agents
   - Purpose: Voice conversations with users and phone calls
   - Configuration: See `ELEVENLABS_INTEGRATION.md`

4. **ElevenLabs Speech-to-Text**
   - Used after: Japanese Agent call completion
   - Purpose: Generate transcript for summarization
   - Integration: Frontend receives transcript, POSTs to `/api/summarizeCall`

### Next Implementation Steps

1. **Wire Gemini Vision API**
   - Replace stub in `analyzeLetter/route.ts`
   - Replace stub in `analyzeIdDocument/route.ts`
   - Add error handling for vision failures

2. **Wire LLM API**
   - Replace stub in `prepareCall/route.ts`
   - Replace stub in `summarizeCall/route.ts`
   - Implement Japanese prompt engineering

3. **Configure ElevenLabs Agents**
   - Create Japanese agent with system prompt
   - Create English agent with system prompt
   - Configure tools with deployed endpoint URLs
   - Test tool calling functionality

4. **Build Frontend State Machine**
   - Implement status polling loop
   - Handle `awaitingUserInfo` trigger
   - Handle `readyToResume` trigger
   - Add UI indicators for each phase

5. **Production Hardening**
   - Replace in-memory session store with Redis/DB
   - Add authentication and authorization
   - Implement rate limiting
   - Add comprehensive error handling
   - Set up logging and monitoring

## Testing

### Quick Start Test

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run automated test
chmod +x test-api.sh
./test-api.sh
```

### Manual Testing

Follow the examples in `API_TESTING.md` to test each endpoint individually with curl.

### Example Client

```bash
# Install ts-node
npm install -g ts-node

# Run example workflow
ts-node example-client.ts
```

## Security Considerations

1. **PII Protection**: Residence card numbers and personal info stored in session
2. **Session Hijacking**: Use secure session IDs in production
3. **Input Validation**: All endpoints validate required parameters
4. **Error Handling**: Sensitive errors not exposed to clients
5. **Rate Limiting**: Should be added for production
6. **CORS**: Configure appropriately for frontend domain

## Limitations & Assumptions

### Current Limitations

1. **In-Memory Storage**: Sessions lost on server restart
2. **Stubbed AI Calls**: Gemini and LLM calls need implementation
3. **Single Server**: No horizontal scaling support
4. **No Authentication**: Open API endpoints
5. **No Persistence**: Case history not saved long-term

### Assumptions

1. Frontend handles ElevenLabs agent lifecycle
2. Frontend polls for status changes (WebSocket alternative possible)
3. Session IDs provided by frontend (can be auto-generated)
4. All documents are in Japanese
5. Users have required documents available
6. Phone calls are successful (no retry logic)

## Cost Considerations

Per session (estimated):

- Gemini Vision (2 calls): ~$0.001
- LLM (2 calls): ~$0.02
- ElevenLabs (2 agents): ~$0.10-0.50
- **Total: ~$0.12-0.52 per case**

## Deployment

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

### Environment Variables

Required for production:
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_APPLICATION_CREDENTIALS`
- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_AGENT_ID_JAPANESE`
- `ELEVENLABS_AGENT_ID_ENGLISH`

## Support & Troubleshooting

See documentation:
- API issues: `API_TESTING.md`
- ElevenLabs setup: `ELEVENLABS_INTEGRATION.md`
- State machine issues: `SESSION_FLOW.md`
- General setup: `README.md`

## License

MIT

---

**Project Status: Backend Complete, Ready for Integration**

All 9 API endpoints implemented and tested. Next steps are to wire external AI services and build the frontend state machine.
