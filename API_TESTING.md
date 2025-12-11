# API Testing Guide

Complete guide for testing all backend endpoints with curl examples and expected responses.

## Setup

Start the development server:

```bash
npm install
npm run dev
```

Server will run on `http://localhost:3000`

---

## Test Sequence: Complete Happy Path

### 1. Analyze Japanese Document

**Request:**
```bash
curl -X POST http://localhost:3000/api/analyzeLetter \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-001",
    "imageBase64": "iVBORw0KGgoAAAANSUhEUg..."
  }'
```

**Expected Response (200):**
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
    "summaryEn": "Unpaid pension contributions notice for April-September 2023, 240,000 yen due by Jan 31, 2025.",
    "rawJson": { ... }
  }
}
```

**State After:** Session created with document

---

### 2. Update User Profile (Multiple Calls)

**Request 1: Name**
```bash
curl -X POST http://localhost:3000/api/updateUserProfile \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-001",
    "patch": {
      "name": "Jane Doe"
    }
  }'
```

**Request 2: Country and Pension System**
```bash
curl -X POST http://localhost:3000/api/updateUserProfile \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-001",
    "patch": {
      "country": "Canada",
      "homePensionSystem": "Canada Pension Plan",
      "hasBilateralAgreement": true
    }
  }'
```

**Expected Response (200):**
```json
{
  "id": "test-001",
  "language": "en",
  "name": "Jane Doe",
  "country": "Canada",
  "homePensionSystem": "Canada Pension Plan",
  "hasBilateralAgreement": true
}
```

**State After:** User profile populated

---

### 3. Prepare Initial Call

**Request:**
```bash
curl -X POST http://localhost:3000/api/prepareCall \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-001",
    "documentId": "doc_1",
    "isResume": false
  }'
```

**Expected Response (200):**
```json
{
  "callContext": {
    "call_goal_en": "Request exemption due to home country pension coverage",
    "call_goal_ja": "本国の年金制度に加入しているため、この期間の日本の年金保険料を免除できるか確認する。",
    "facts_to_state_ja": [
      "利用者はイギリスの年金制度(National Insurance)に加入している。",
      "日英の社会保障協定の対象となる勤務形態である。",
      "対象期間は2023年4月から9月である。"
    ],
    "questions_to_ask_ja": [
      "この期間の日本の年金保険料が免除される可能性はあるか。",
      "必要な書類と提出方法を教えてほしい。"
    ]
  },
  "memoryBlob": "User Jane Doe from Canada paying pension in Canada Pension Plan received notice from Shibuya Pension Office for 240000 yen.",
  "isResume": false
}
```

**State After:** Case created, ready for Japanese Agent

---

### 4. Check Session Status

**Request:**
```bash
curl -X GET "http://localhost:3000/api/getSessionStatus?sessionId=test-001"
```

**Expected Response (200):**
```json
{
  "sessionId": "test-001",
  "hasCurrentCase": true,
  "awaitingUserInfo": false,
  "pendingField": null,
  "pendingReason": null,
  "readyToResume": false,
  "user": {
    "id": "test-001",
    "language": "en",
    "name": "Jane Doe",
    "country": "Canada",
    "homePensionSystem": "Canada Pension Plan",
    "hasBilateralAgreement": true
  }
}
```

**State:** Ready for Japanese Agent to start call

---

### 5. Japanese Agent Requests User Info

**Request:**
```bash
curl -X POST http://localhost:3000/api/requestUserInfoTool \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-001",
    "field": "residence_card_number",
    "reason": "The pension office needs your residence card number to verify your status"
  }'
```

**Expected Response (200):**
```json
{
  "status": "pending",
  "field": "residence_card_number",
  "reason": "The pension office needs your residence card number to verify your status",
  "message": "Pausing call - need to gather user info"
}
```

**State After:** Call paused, waiting for user info

---

### 6. Check Session Status (After Info Request)

**Request:**
```bash
curl -X GET "http://localhost:3000/api/getSessionStatus?sessionId=test-001"
```

**Expected Response (200):**
```json
{
  "sessionId": "test-001",
  "hasCurrentCase": true,
  "awaitingUserInfo": true,
  "pendingField": "residence_card_number",
  "pendingReason": "The pension office needs your residence card number to verify your status",
  "readyToResume": false,
  "user": { ... }
}
```

**Key Change:** `awaitingUserInfo: true` → Triggers English Agent

---

### 7. English Agent Analyzes ID Document

**Request:**
```bash
curl -X POST http://localhost:3000/api/analyzeIdDocument \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-001",
    "imageBase64": "iVBORw0KGgoAAAANSUhEUg...",
    "extractField": "residence_card_number"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "extracted": {
    "residence_card_number": "A1234567890",
    "name": "Jane Doe",
    "expiration_date": "2028-06-15"
  }
}
```

**Note:** This does NOT update session state yet

---

### 8. English Agent Resolves User Info

**Request:**
```bash
curl -X POST http://localhost:3000/api/resolveUserInfo \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-001",
    "field": "residence_card_number",
    "value": "A1234567890"
  }'
```

**Expected Response (200):**
```json
{
  "resolved": true,
  "field": "residence_card_number",
  "value": "A1234567890",
  "readyToResume": true,
  "user": {
    "id": "test-001",
    "name": "Jane Doe",
    "country": "Canada",
    "homePensionSystem": "Canada Pension Plan",
    "hasBilateralAgreement": true,
    "residenceCardNumber": "A1234567890"
  }
}
```

**State After:** Info stored, ready to resume

---

### 9. Check Session Status (After Resolution)

**Request:**
```bash
curl -X GET "http://localhost:3000/api/getSessionStatus?sessionId=test-001"
```

**Expected Response (200):**
```json
{
  "sessionId": "test-001",
  "hasCurrentCase": true,
  "awaitingUserInfo": false,
  "pendingField": null,
  "pendingReason": null,
  "readyToResume": true,
  "user": {
    "residenceCardNumber": "A1234567890",
    ...
  }
}
```

**Key Change:** `readyToResume: true` → Triggers Japanese Agent resume

---

### 10. Prepare Resume Call

**Request:**
```bash
curl -X POST http://localhost:3000/api/prepareCall \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-001",
    "documentId": "doc_1",
    "isResume": true
  }'
```

**Expected Response (200):**
```json
{
  "callContext": { ... },
  "memoryBlob": "User Jane Doe from Canada paying pension in Canada Pension Plan received notice from Shibuya Pension Office for 240000 yen. UPDATE: User provided residence_card_number: A1234567890",
  "isResume": true
}
```

**Note:** memoryBlob now includes the new information

---

### 11. Summarize Call

**Request:**
```bash
curl -X POST http://localhost:3000/api/summarizeCall \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-001",
    "transcript": "もしもし、年金事務所です。User explains situation in Japanese. Operator agrees to review exemption request. Call ends politely."
  }'
```

**Expected Response (200):**
```json
{
  "callSummaryEn": "You called the pension office, explained your home country pension coverage, and they agreed to review your exemption request.",
  "nextStepsEn": "- Send copy of UK National Insurance certificate by email to pension.shibuya@example.jp\n- Wait for confirmation letter (4-6 weeks)\n- If no response, call again using reference number: REF-2024-1234"
}
```

**State After:** Call completed with summary

---

## Error Cases

### Missing Required Parameters

**Request:**
```bash
curl -X POST http://localhost:3000/api/analyzeLetter \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-001"
  }'
```

**Expected Response (400):**
```json
{
  "error": "imageBase64 is required"
}
```

---

### Document Not Found

**Request:**
```bash
curl -X POST http://localhost:3000/api/prepareCall \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-001",
    "documentId": "doc_999",
    "isResume": false
  }'
```

**Expected Response (404):**
```json
{
  "error": "Document not found"
}
```

---

### No Active Case

**Request:**
```bash
curl -X POST http://localhost:3000/api/requestUserInfoTool \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "new-session-no-case",
    "field": "residence_card_number"
  }'
```

**Expected Response (400):**
```json
{
  "error": "No active case"
}
```

---

### Invalid Field Type

**Request:**
```bash
curl -X POST http://localhost:3000/api/resolveUserInfo \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-001",
    "field": "invalid_field",
    "value": "some_value"
  }'
```

**Expected Response (400):**
```json
{
  "error": "Invalid field type"
}
```

---

## Automated Test Script

Save as `test-api.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000/api"
SESSION_ID="test-$(date +%s)"

echo "Testing Japanese Bureaucracy Assistant API"
echo "Session ID: $SESSION_ID"
echo ""

echo "1. Analyzing document..."
ANALYZE_RESP=$(curl -s -X POST "$BASE_URL/analyzeLetter" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"imageBase64\": \"test\"}")

DOC_ID=$(echo $ANALYZE_RESP | jq -r '.id')
echo "Document ID: $DOC_ID"
echo ""

echo "2. Updating user profile..."
curl -s -X POST "$BASE_URL/updateUserProfile" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"patch\": {\"name\": \"Test User\", \"country\": \"UK\"}}" \
  | jq '.'
echo ""

echo "3. Preparing call..."
curl -s -X POST "$BASE_URL/prepareCall" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"documentId\": \"$DOC_ID\", \"isResume\": false}" \
  | jq '.isResume'
echo ""

echo "4. Requesting user info..."
curl -s -X POST "$BASE_URL/requestUserInfoTool" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"field\": \"residence_card_number\", \"reason\": \"Test\"}" \
  | jq '.status'
echo ""

echo "5. Checking session status..."
curl -s -X GET "$BASE_URL/getSessionStatus?sessionId=$SESSION_ID" \
  | jq '{awaitingUserInfo, readyToResume}'
echo ""

echo "6. Analyzing ID document..."
curl -s -X POST "$BASE_URL/analyzeIdDocument" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"imageBase64\": \"test\", \"extractField\": \"residence_card_number\"}" \
  | jq '.extracted.residence_card_number'
echo ""

echo "7. Resolving user info..."
curl -s -X POST "$BASE_URL/resolveUserInfo" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"field\": \"residence_card_number\", \"value\": \"A1234567890\"}" \
  | jq '.resolved'
echo ""

echo "8. Checking session status (should be ready to resume)..."
curl -s -X GET "$BASE_URL/getSessionStatus?sessionId=$SESSION_ID" \
  | jq '{awaitingUserInfo, readyToResume}'
echo ""

echo "9. Preparing resume call..."
curl -s -X POST "$BASE_URL/prepareCall" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"documentId\": \"$DOC_ID\", \"isResume\": true}" \
  | jq '.isResume'
echo ""

echo "10. Summarizing call..."
curl -s -X POST "$BASE_URL/summarizeCall" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\", \"transcript\": \"Test transcript\"}" \
  | jq '.callSummaryEn'
echo ""

echo "Test complete!"
```

Make executable and run:

```bash
chmod +x test-api.sh
./test-api.sh
```

---

## Performance Testing

### Load Test with Apache Bench

```bash
ab -n 100 -c 10 -p payload.json -T application/json \
  http://localhost:3000/api/getSessionStatus?sessionId=demo
```

### Concurrent Sessions Test

```bash
for i in {1..10}; do
  SESSION_ID="load-test-$i"
  curl -X POST http://localhost:3000/api/analyzeLetter \
    -H "Content-Type: application/json" \
    -d "{\"sessionId\": \"$SESSION_ID\", \"imageBase64\": \"test\"}" &
done
wait
echo "All requests completed"
```

---

## Debugging Tips

### 1. Inspect Full Session State

Add this debug endpoint temporarily:

```typescript
// app/api/debug/session/route.ts
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId') || 'demo';
  const session = getSession(sessionId);
  return NextResponse.json(session, { status: 200 });
}
```

Test:
```bash
curl http://localhost:3000/api/debug/session?sessionId=test-001 | jq '.'
```

### 2. Watch Logs

```bash
npm run dev 2>&1 | tee api-logs.txt
```

### 3. Test with Postman

Import this collection:

```json
{
  "info": {
    "name": "Japanese Bureaucracy Assistant",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Analyze Letter",
      "request": {
        "method": "POST",
        "header": [],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"sessionId\": \"{{sessionId}}\",\n  \"imageBase64\": \"test\"\n}",
          "options": {
            "raw": {
              "language": "json"
            }
          }
        },
        "url": {
          "raw": "{{baseUrl}}/api/analyzeLetter",
          "host": ["{{baseUrl}}"],
          "path": ["api", "analyzeLetter"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    },
    {
      "key": "sessionId",
      "value": "demo"
    }
  ]
}
```

---

## Common Issues

### Issue: "No active case" error

**Cause:** Trying to call info-related endpoints before calling `/prepareCall`

**Fix:** Always call `/prepareCall` after analyzing document and updating profile

### Issue: Session state not updating

**Cause:** Using different sessionId values across requests

**Fix:** Use consistent sessionId throughout the flow

### Issue: 500 errors

**Cause:** Malformed JSON or unexpected data types

**Fix:** Validate JSON with `jq` before sending:
```bash
echo '{"test": "data"}' | jq '.' && echo "Valid JSON"
```
