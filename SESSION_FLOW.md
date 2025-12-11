# Session Flow and State Management

This document explains how the session state machine works and coordinates the two-agent handoff.

## Session Lifecycle

### Phase 1: Document Upload and Analysis

```
User uploads image
  ↓
POST /api/analyzeLetter
  ↓
Session created with:
  - user: { id: "demo", language: "en" }
  - documents: [{ id: "doc_1", type: "pension_non_payment", ... }]
```

**State after Phase 1:**
```json
{
  "user": {
    "id": "demo",
    "language": "en"
  },
  "documents": [
    {
      "id": "doc_1",
      "type": "pension_non_payment",
      "extracted": { ... }
    }
  ]
}
```

---

### Phase 2: User Profile Building

```
Frontend collects user information
  ↓
Multiple calls to POST /api/updateUserProfile
  ↓
Session user object updated incrementally
```

**Example calls:**

```javascript
await fetch('/api/updateUserProfile', {
  method: 'POST',
  body: JSON.stringify({
    sessionId: 'demo',
    patch: { name: 'John Smith' }
  })
});

await fetch('/api/updateUserProfile', {
  method: 'POST',
  body: JSON.stringify({
    sessionId: 'demo',
    patch: {
      country: 'UK',
      homePensionSystem: 'National Insurance',
      hasBilateralAgreement: true
    }
  })
});
```

**State after Phase 2:**
```json
{
  "user": {
    "id": "demo",
    "language": "en",
    "name": "John Smith",
    "country": "UK",
    "homePensionSystem": "National Insurance",
    "hasBilateralAgreement": true
  },
  "documents": [ ... ]
}
```

---

### Phase 3: Prepare Japanese Agent Call

```
Frontend calls POST /api/prepareCall
  ↓
LLM generates Japanese context based on user + document
  ↓
Case created with callContext and memoryBlob
```

**State after Phase 3:**
```json
{
  "user": { ... },
  "documents": [ ... ],
  "currentCase": {
    "id": "case_doc_1",
    "userId": "demo",
    "documentId": "doc_1",
    "callContext": {
      "call_goal_en": "Request exemption due to home country pension coverage",
      "call_goal_ja": "本国の年金制度に加入しているため...",
      "facts_to_state_ja": [ ... ],
      "questions_to_ask_ja": [ ... ]
    },
    "memoryBlob": "User John Smith from UK...",
    "readyToResume": false
  }
}
```

---

### Phase 4: Japanese Agent Call Starts

```
Frontend starts ElevenLabs conversation with JAPANESE agent
  ↓
Agent receives callContext and memoryBlob
  ↓
Agent calls pension office (real phone call)
  ↓
Operator asks for information agent doesn't have
```

**No state change yet** - agent is actively on call

---

### Phase 5: Information Request (PAUSE)

```
Japanese Agent realizes it needs residence card number
  ↓
Agent calls tool: POST /api/requestUserInfoTool
  ↓
Session updated with pending information
```

**State after Phase 5:**
```json
{
  "user": { ... },
  "documents": [ ... ],
  "currentCase": {
    "id": "case_doc_1",
    "userId": "demo",
    "documentId": "doc_1",
    "callContext": { ... },
    "memoryBlob": "User John Smith from UK...",
    "pendingField": "residence_card_number",
    "pendingReason": "Pension office requires residence card number for verification",
    "awaitingUserInfo": true,    // ← KEY STATE CHANGE
    "readyToResume": false
  }
}
```

**Key State Flags:**
- `awaitingUserInfo: true` → Signals frontend to start English Agent
- `pendingField` → What information is needed
- `pendingReason` → Why (shown to user by English Agent)

---

### Phase 6: Frontend Polling Detects Need for English Agent

```
Frontend polls GET /api/getSessionStatus every 2 seconds
  ↓
Response includes awaitingUserInfo: true
  ↓
Frontend starts ElevenLabs conversation with ENGLISH agent
```

**Frontend polling logic:**

```typescript
async function pollSession() {
  const res = await fetch('/api/getSessionStatus?sessionId=demo');
  const status = await res.json();

  if (status.awaitingUserInfo && !englishAgentActive) {
    startEnglishAgent(status.pendingField, status.pendingReason);
  }

  if (status.readyToResume && !japaneseAgentResumed) {
    resumeJapaneseAgent(status.currentCase.documentId);
  }

  setTimeout(pollSession, 2000);
}
```

---

### Phase 7: English Agent Gathers Information

```
English Agent starts conversation with user
  ↓
Agent: "I need your residence card number. Can you upload a photo?"
  ↓
User uploads image
  ↓
English Agent calls: POST /api/analyzeIdDocument
  ↓
Gemini extracts: { residence_card_number: "A1234567890", ... }
  ↓
English Agent confirms with user
  ↓
User: "Yes, that's correct"
```

**State still unchanged** - information not yet stored

---

### Phase 8: Information Resolution (RESUME)

```
English Agent calls: POST /api/resolveUserInfo
  ↓
Session updated with new information
  ↓
Pending flags cleared, readyToResume set to true
```

**State after Phase 8:**
```json
{
  "user": {
    "id": "demo",
    "name": "John Smith",
    "country": "UK",
    "residenceCardNumber": "A1234567890"  // ← NEW INFO
  },
  "documents": [ ... ],
  "currentCase": {
    "id": "case_doc_1",
    "callContext": { ... },
    "memoryBlob": "User John Smith from UK...",
    "pendingField": undefined,           // ← CLEARED
    "pendingReason": undefined,          // ← CLEARED
    "awaitingUserInfo": false,           // ← CLEARED
    "readyToResume": true                // ← KEY STATE CHANGE
  }
}
```

**Key State Flags:**
- `readyToResume: true` → Signals frontend to resume Japanese Agent
- `awaitingUserInfo: false` → English Agent can end
- Pending fields cleared

---

### Phase 9: Japanese Agent Call Resumes

```
Frontend detects readyToResume: true
  ↓
Frontend calls: POST /api/prepareCall with isResume: true
  ↓
memoryBlob updated with new information
  ↓
Japanese Agent conversation resumes with updated context
```

**Updated memoryBlob:**

```
"User John Smith from UK paying pension in National Insurance received notice from Shibuya Pension Office for 240000 yen. UPDATE: User provided residence_card_number: A1234567890"
```

**Japanese Agent continues:**
```
Operator: "在留カードの番号を教えてください"
Agent: "在留カード番号は A1234567890 です" (My residence card number is A1234567890)
Operator: "確認できました。手続きを進めます" (Confirmed. I'll proceed with the process)
```

---

### Phase 10: Call Completion and Summarization

```
Japanese Agent completes call
  ↓
ElevenLabs Speech-to-Text generates transcript
  ↓
Frontend calls: POST /api/summarizeCall with transcript
  ↓
LLM analyzes transcript and generates summary + next steps
```

**Final State:**
```json
{
  "user": { ... },
  "documents": [ ... ],
  "currentCase": {
    "id": "case_doc_1",
    "callContext": { ... },
    "memoryBlob": "...",
    "callSummaryEn": "You called the pension office, explained your home country pension coverage, and they agreed to review your exemption request.",
    "nextStepsEn": "- Send copy of UK National Insurance certificate by email...\n- Wait for confirmation letter (4-6 weeks)...",
    "awaitingUserInfo": false,
    "readyToResume": false
  }
}
```

**Frontend displays to user:**
- Call summary (what happened)
- Next steps (what to do next)

---

## State Transition Diagram

```
[INITIAL]
   ↓
[DOCUMENT_ANALYZED] → documents array populated
   ↓
[PROFILE_COMPLETE] → user object populated
   ↓
[CALL_PREPARED] → currentCase created with callContext
   ↓
[JAPANESE_CALL_ACTIVE] → Japanese Agent on call
   ↓
[INFO_PENDING] → awaitingUserInfo: true
   ↓
[ENGLISH_GATHERING] → English Agent active
   ↓
[INFO_RESOLVED] → readyToResume: true
   ↓
[JAPANESE_CALL_RESUMED] → Japanese Agent continues
   ↓
[CALL_COMPLETE] → callSummaryEn and nextStepsEn populated
   ↓
[FINISHED]
```

---

## Key State Flags

### awaitingUserInfo

**When true:**
- Japanese Agent call is paused
- English Agent should start
- Frontend should display "Gathering additional information..."

**Set by:** `POST /api/requestUserInfoTool`

**Cleared by:** `POST /api/resolveUserInfo`

### readyToResume

**When true:**
- Information has been gathered
- Japanese Agent call can continue
- Frontend should call `/api/prepareCall` with `isResume: true`

**Set by:** `POST /api/resolveUserInfo`

**Cleared by:** `POST /api/prepareCall` (when resume happens)

### pendingField

**Values:**
- `"residence_card_number"` - Need residence card
- `"pension_number"` - Need pension number
- `undefined` - No pending information

**Purpose:** Tells English Agent what to ask for

### pendingReason

**Purpose:** Human-readable explanation shown to user

**Example:** "Pension office requires residence card number for verification"

---

## Error Scenarios

### Scenario 1: User Refuses to Provide Information

```
English Agent asks for document
  ↓
User: "I don't have it right now"
  ↓
English Agent should gracefully end and NOT call resolve_user_info
  ↓
Japanese Agent call remains paused indefinitely
```

**Handling:** Frontend should provide "Cancel Call" button to clean up state

### Scenario 2: Image Analysis Fails

```
User uploads blurry image
  ↓
POST /api/analyzeIdDocument returns error or invalid data
  ↓
English Agent: "Sorry, I couldn't read that. Can you upload a clearer photo?"
  ↓
Retry flow
```

### Scenario 3: Japanese Agent Call Drops

```
Phone connection lost during call
  ↓
No state change (still shows awaitingUserInfo or readyToResume)
  ↓
Frontend should detect dropped call from ElevenLabs
  ↓
Offer user option to restart or cancel
```

---

## Implementation Checklist

- [ ] Implement frontend polling of `/api/getSessionStatus`
- [ ] Handle `awaitingUserInfo: true` by starting English Agent
- [ ] Handle `readyToResume: true` by resuming Japanese Agent
- [ ] Add UI indicators for each phase (analyzing, calling, gathering info, resuming)
- [ ] Implement error handling for each API call
- [ ] Add "Cancel" button for user to abort flow
- [ ] Add retry logic for failed API calls
- [ ] Implement session timeout and cleanup
- [ ] Add loading states during transitions
- [ ] Test complete flow end-to-end

---

## Advanced: Session Persistence

Currently sessions are in-memory. For production:

### Option 1: Redis

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function getSession(sessionId: string) {
  const data = await redis.get(`session:${sessionId}`);
  return data ? JSON.parse(data) : createNewSession(sessionId);
}

export async function saveSession(sessionId: string, state: SessionState) {
  await redis.setex(
    `session:${sessionId}`,
    3600, // 1 hour TTL
    JSON.stringify(state)
  );
}
```

### Option 2: Database (PostgreSQL)

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_data JSONB NOT NULL,
  documents JSONB NOT NULL,
  current_case JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_updated ON sessions(updated_at);
```

---

## Security Considerations

1. **Session Hijacking:** Add authentication tokens to session IDs
2. **Data Expiration:** Automatically delete sessions after 24 hours
3. **PII Protection:** Encrypt sensitive fields (residence card numbers)
4. **Rate Limiting:** Limit API calls per session
5. **Audit Logging:** Log all state transitions for debugging

---

## Monitoring and Debugging

### Useful Debug Endpoints

Add these for development:

```typescript
// GET /api/debug/session?sessionId=demo
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId') || 'demo';
  const session = getSession(sessionId);
  return NextResponse.json(session, { status: 200 });
}

// DELETE /api/debug/session?sessionId=demo
export async function DELETE(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId') || 'demo';
  // Clear session
  return NextResponse.json({ deleted: true }, { status: 200 });
}
```

### Logging State Transitions

```typescript
function logStateTransition(sessionId: string, from: string, to: string) {
  console.log(`[${sessionId}] ${from} → ${to}`, {
    timestamp: new Date().toISOString(),
    sessionId,
    transition: { from, to }
  });
}
```
