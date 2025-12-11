# Japanese Bureaucracy Assistant - Two-Agent Backend

An AI-powered Japanese bureaucracy assistant that uses two ElevenLabs Agents working together to help users navigate Japanese government paperwork and make phone calls on their behalf.

## System Architecture

### Two-Agent Handoff Flow

```
User uploads Japanese letter
  → Gemini Vision analyzes document
  → User completes profile interview
  → Japanese Agent calls pension office
  → Japanese Agent needs info (e.g., residence card)
    → calls request_user_info tool
    → call PAUSES
  → English Agent conversation starts
    → asks user for document
    → analyzes with Gemini Vision
    → calls resolve_user_info
    → conversation ENDS
  → Japanese Agent resumes call with updated info
  → call completes
  → ElevenLabs Speech-to-Text generates transcript
  → LLM summarizes
  → user gets next steps
```

## Project Structure

```
project/
├── lib/
│   └── sessionStore.ts          # In-memory session management with TypeScript types
├── app/
│   └── api/
│       ├── analyzeLetter/       # POST - Analyze Japanese document with Gemini Vision
│       ├── updateUserProfile/   # POST - Update user profile during prep interview
│       ├── prepareCall/         # POST - Prepare context for Japanese Agent
│       ├── requestUserInfoTool/ # POST - ElevenLabs tool (Japanese Agent)
│       ├── analyzeIdDocument/   # POST - ElevenLabs tool (English Agent)
│       ├── resolveUserInfo/     # POST - ElevenLabs tool (English Agent)
│       ├── getSessionStatus/    # GET  - Poll session state for handoff coordination
│       └── summarizeCall/       # POST - Generate call summary from transcript
├── .env                         # Environment variables
├── package.json
├── tsconfig.json
└── next.config.js
```

## API Endpoints

### 1. POST `/api/analyzeLetter`

Analyzes uploaded Japanese document images using Google Vertex AI Gemini Vision.

**Request:**
```json
{
  "imageBase64": "base64_encoded_image_string",
  "sessionId": "demo"
}
```

**Response:**
```json
{
  "id": "doc_1",
  "type": "pension_non_payment",
  "extracted": {
    "issuer": "Shibuya Pension Office",
    "amountYen": 240000,
    "dueDate": "2025-01-31",
    "period": "2023-04-01 to 2023-09-30",
    "contactPhone": "03-XXXX-YYYY",
    "isPaymentRequired": true,
    "summaryEn": "Unpaid pension contributions notice...",
    "rawJson": {...}
  }
}
```

### 2. POST `/api/updateUserProfile`

Updates user profile incrementally during prep interview.

**Request:**
```json
{
  "sessionId": "demo",
  "patch": {
    "name": "John Smith",
    "country": "UK",
    "homePensionSystem": "National Insurance"
  }
}
```

**Response:**
```json
{
  "id": "demo",
  "name": "John Smith",
  "country": "UK",
  "homePensionSystem": "National Insurance",
  "language": "en"
}
```

### 3. POST `/api/prepareCall`

Prepares context for Japanese Agent before call (initial or resumed).

**Request:**
```json
{
  "sessionId": "demo",
  "documentId": "doc_1",
  "isResume": false
}
```

**Response:**
```json
{
  "callContext": {
    "call_goal_en": "Request exemption due to home country pension coverage",
    "call_goal_ja": "本国の年金制度に加入しているため...",
    "facts_to_state_ja": ["利用者はイギリスの年金制度..."],
    "questions_to_ask_ja": ["この期間の日本の年金保険料が免除される可能性はあるか..."]
  },
  "memoryBlob": "User John Smith from UK paying pension in National Insurance...",
  "isResume": false
}
```

### 4. POST `/api/requestUserInfoTool`

ElevenLabs Tool for Japanese Agent - called when agent needs user information during call.

**Request:**
```json
{
  "sessionId": "demo",
  "field": "residence_card_number",
  "reason": "Pension office requires residence card number for verification"
}
```

**Response:**
```json
{
  "status": "pending",
  "field": "residence_card_number",
  "reason": "Pension office requires residence card number for verification",
  "message": "Pausing call - need to gather user info"
}
```

### 5. POST `/api/analyzeIdDocument`

ElevenLabs Tool for English Agent - extracts info from user's ID documents.

**Request:**
```json
{
  "imageBase64": "base64_encoded_id_image",
  "sessionId": "demo",
  "extractField": "residence_card_number"
}
```

**Response:**
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

### 6. POST `/api/resolveUserInfo`

ElevenLabs Tool for English Agent - stores gathered info and signals readiness to resume.

**Request:**
```json
{
  "sessionId": "demo",
  "field": "residence_card_number",
  "value": "A1234567890"
}
```

**Response:**
```json
{
  "resolved": true,
  "field": "residence_card_number",
  "value": "A1234567890",
  "readyToResume": true,
  "user": {...}
}
```

### 7. GET `/api/getSessionStatus`

Allows frontend to poll current session state for agent handoff coordination.

**Query Parameters:**
- `sessionId` (optional, default: "demo")

**Response:**
```json
{
  "sessionId": "demo",
  "hasCurrentCase": true,
  "awaitingUserInfo": false,
  "pendingField": null,
  "pendingReason": null,
  "readyToResume": false,
  "user": {...}
}
```

### 8. POST `/api/summarizeCall`

Generates call summary and next steps after call completes using transcript from ElevenLabs.

**Request:**
```json
{
  "sessionId": "demo",
  "transcript": "Call transcript from ElevenLabs Speech-to-Text..."
}
```

**Response:**
```json
{
  "callSummaryEn": "You called the pension office, explained your home country pension coverage...",
  "nextStepsEn": "- Send copy of UK National Insurance certificate by email...\n- Wait for confirmation letter (4-6 weeks)..."
}
```

## TypeScript Types

### Core Data Types

```typescript
type UserProfile = {
  id: string;
  name?: string;
  country?: string;
  homePensionSystem?: string;
  hasBilateralAgreement?: boolean;
  pensionNumber?: string;
  residenceCardNumber?: string;
  language?: string;
};

type DocumentType = "marketing_electricity" | "pension_non_payment" | "other";

type CaseDocument = {
  id: string;
  type: DocumentType;
  originalImageUrl?: string;
  extracted: {
    issuer?: string;
    amountYen?: number | null;
    dueDate?: string | null;
    period?: string | null;
    contactPhone?: string | null;
    isPaymentRequired?: boolean | null;
    summaryEn?: string | null;
    rawJson?: any;
  };
};

type CaseState = {
  id: string;
  userId: string;
  documentId: string;
  callContext?: any;
  memoryBlob?: string;
  callSummaryEn?: string;
  nextStepsEn?: string;
  pendingField?: string;
  pendingReason?: string;
  awaitingUserInfo?: boolean;
  readyToResume?: boolean;
};

type SessionState = {
  user: UserProfile;
  documents: CaseDocument[];
  currentCase?: CaseState;
};
```

## ElevenLabs Agent Configuration

### Japanese Agent (Operator Caller)

- **Language:** Japanese
- **System Prompt:** Receives `callContext` object with Japanese phrases and goals
- **Tools:**
  - `request_user_info` → `/api/requestUserInfoTool`
- **Behavior:** Calls pension office, asks tool for missing info, conversation pauses

### English Agent (User Assistant)

- **Language:** English
- **System Prompt:** "Help users provide missing bureaucratic information"
- **Tools:**
  - `analyze_id_document` → `/api/analyzeIdDocument`
  - `resolve_user_info` → `/api/resolveUserInfo`
- **Behavior:** Asks user for documents, extracts data, confirms and resolves

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Update `.env` with your API keys:

```env
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
VERTEX_AI_LOCATION=us-central1

OPENAI_API_KEY=your-openai-api-key-here

ELEVENLABS_API_KEY=your-elevenlabs-api-key-here
ELEVENLABS_AGENT_ID_JAPANESE=your-japanese-agent-id-here
ELEVENLABS_AGENT_ID_ENGLISH=your-english-agent-id-here
```

### 3. Run Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000/api/`

### 4. Build for Production

```bash
npm run build
npm start
```

## Integration Tasks

### TODO: Wire Gemini Vision API

In `app/api/analyzeLetter/route.ts` and `app/api/analyzeIdDocument/route.ts`, replace stub data with actual Gemini Vision API calls:

```typescript
import { PredictionServiceClient } from '@google-cloud/aiplatform';

const client = new PredictionServiceClient();
```

### TODO: Wire LLM API Calls

In `app/api/prepareCall/route.ts` and `app/api/summarizeCall/route.ts`, replace stub data with OpenAI/Claude API calls:

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
```

### TODO: Configure ElevenLabs Agents

1. Create two agents in ElevenLabs dashboard
2. Configure Japanese Agent with tool: `/api/requestUserInfoTool`
3. Configure English Agent with tools: `/api/analyzeIdDocument`, `/api/resolveUserInfo`
4. Add agent IDs to `.env`

### TODO: Build Frontend State Machine

Create a frontend that:
1. Polls `/api/getSessionStatus` every 2-3 seconds
2. Triggers English Agent when `awaitingUserInfo === true`
3. Resumes Japanese Agent when `readyToResume === true`

### TODO: Integrate ElevenLabs Speech-to-Text

After call completion, use ElevenLabs Speech-to-Text API to get transcript, then POST to `/api/summarizeCall`

## Session Store

The session store is in-memory (data resets on server restart). For production, consider:

- Redis for distributed session management
- PostgreSQL/MongoDB for persistent storage
- Session expiration policies

## Error Handling

All endpoints include try-catch blocks and return appropriate HTTP status codes:

- `200` - Success
- `400` - Bad Request (missing parameters, no active case)
- `404` - Not Found (document not found)
- `500` - Internal Server Error

## Security Considerations

- Validate all user inputs
- Sanitize base64 image data before processing
- Implement rate limiting for API endpoints
- Add authentication middleware for production
- Secure API keys using environment variables
- Consider CORS configuration for frontend integration

## License

MIT
