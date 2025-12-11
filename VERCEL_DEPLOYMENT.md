# Vercel Deployment Guide

Complete step-by-step guide to deploy your Japanese Bureaucracy Assistant to Vercel with real-time streaming.

## Prerequisites

- Vercel account (free tier works)
- Pusher account (free tier works)
- Google Cloud account (with Translation API)
- ElevenLabs account
- GitHub account (for deployment)

## Step 1: Prepare Your Repository

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main
```

### 2. Verify Files

Make sure these files exist:
- `vercel.json` - Vercel configuration
- `package.json` - Dependencies
- `.gitignore` - Excludes `.env` and `node_modules`

## Step 2: Set Up External Services

### Pusher Setup

1. **Sign up**: [https://pusher.com/signup](https://pusher.com/signup)
2. **Create app**:
   - Name: `japanese-assistant`
   - Cluster: Choose closest to your users (e.g., `us2`)
3. **Get credentials** from dashboard:
   - App ID: `123456`
   - Key: `abc123key`
   - Secret: `xyz789secret`
   - Cluster: `us2`

### Google Cloud Translation Setup

1. **Create project**:
   - Go to [console.cloud.google.com](https://console.cloud.google.com)
   - Create new project: `japanese-assistant`
   - Note the Project ID

2. **Enable Translation API**:
   - Go to APIs & Services → Library
   - Search "Cloud Translation API"
   - Click "Enable"

3. **Create service account**:
   - Go to IAM & Admin → Service Accounts
   - Click "Create Service Account"
   - Name: `translation-service`
   - Role: `Cloud Translation API User`
   - Click "Create Key" → JSON
   - Download `service-account.json`
   - **Keep this file secure!**

4. **Prepare for Vercel**:
   - Open `service-account.json`
   - Copy entire JSON content
   - You'll paste this into Vercel later

## Step 3: Deploy to Vercel

### Option A: Deploy via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name? japanese-bureaucracy-assistant
# - Which directory is your code? ./
# - Modify settings? No
```

### Option B: Deploy via Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Configure project:
   - Framework Preset: Next.js
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`
4. Click "Deploy"

## Step 4: Configure Environment Variables

### In Vercel Dashboard

1. Go to your project dashboard
2. Click Settings → Environment Variables
3. Add these variables:

#### Pusher (Required for Streaming)
```
PUSHER_APP_ID=123456
PUSHER_SECRET=xyz789secret
NEXT_PUBLIC_PUSHER_KEY=abc123key
NEXT_PUBLIC_PUSHER_CLUSTER=us2
```

#### Google Cloud (Required for Translation)
```
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_PROJECT=your-project-id
```

For `GOOGLE_APPLICATION_CREDENTIALS`:
- **Key**: `GOOGLE_APPLICATION_CREDENTIALS`
- **Value**: Paste entire JSON from service account file (not the file path!)
- **Format**: The JSON should look like this:
  ```json
  {"type":"service_account","project_id":"your-project","private_key_id":"abc123",...}
  ```
- **Important**:
  - ✅ Paste the JSON content directly
  - ❌ Do NOT use a file path like `./service-account.json`
  - The code automatically detects whether it's a JSON string or file path

#### ElevenLabs (Required for Voice Agents)
```
ELEVENLABS_API_KEY=sk_xxxxx
ELEVENLABS_AGENT_ID_JAPANESE=agt_xxxxx
ELEVENLABS_AGENT_ID_ENGLISH=agt_xxxxx
```

#### OpenAI (Optional - for LLM calls)
```
OPENAI_API_KEY=sk-xxxxx
```

#### Supabase (Pre-configured)
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_SUPABASE_ANON_KEY=eyJxxx
```

### Environment Variable Tips

- Variables starting with `NEXT_PUBLIC_` are exposed to frontend
- Secret variables (API keys, secrets) should NOT start with `NEXT_PUBLIC_`
- All variables apply to production by default
- You can set different values for preview/development

## Step 5: Verify Deployment

### Test Basic Endpoints

```bash
# Replace with your Vercel URL
VERCEL_URL="https://your-app.vercel.app"

# Test API
curl "$VERCEL_URL/api/getSessionStatus?sessionId=demo"
```

Expected response:
```json
{
  "sessionId": "demo",
  "hasCurrentCase": false,
  "awaitingUserInfo": false,
  ...
}
```

### Test Frontend

1. Visit: `https://your-app.vercel.app`
2. Click "Open Testing Interface"
3. Test each endpoint
4. Verify responses appear

### Test Streaming

1. Visit: `https://your-app.vercel.app/stream-test`
2. Enter a test conversation ID
3. Click "Start Stream"
4. Status should show "connected"

If you get errors, check environment variables.

## Step 6: Configure Custom Domain (Optional)

### Add Custom Domain

1. Go to Project Settings → Domains
2. Add domain: `assistant.yourdomain.com`
3. Add DNS records (Vercel provides instructions)
4. Wait for DNS propagation (up to 24 hours)

### SSL Certificate

Vercel automatically provisions SSL certificates. No action needed.

## Troubleshooting

### Build Failures

**Error**: `Module not found`
```bash
# Locally test build
npm run build

# If it works locally but not on Vercel:
# - Check Node.js version in package.json
# - Verify all dependencies in package.json
```

**Error**: `Type error in route.ts`
```bash
# Make sure you're using TypeScript correctly
npm run lint
```

### Environment Variable Issues

**Pusher not connecting**:
1. Verify `NEXT_PUBLIC_PUSHER_KEY` starts with `NEXT_PUBLIC_`
2. Check Pusher cluster matches your app
3. Look for errors in browser console

**Translation not working**:
1. Verify Google Cloud JSON is valid
2. Check Translation API is enabled in GCP
3. Verify Project ID matches

**Test environment variables**:
```bash
# In Vercel dashboard, go to:
# Settings → Environment Variables → [variable] → Show Secret
```

### Function Timeout

**Error**: Function timed out after 10 seconds

**Solutions**:
1. **Upgrade to Pro**: 300 second timeout
2. **Optimize**: Reduce processing time
3. **Split**: Break into smaller operations

For streaming, Pro plan recommended (free trials available).

### WebSocket Issues

**Error**: WebSocket connection failed

**Check**:
1. ElevenLabs API key valid
2. Conversation ID exists
3. Firewall allows WebSockets

**Debug**:
```bash
# View function logs in Vercel
vercel logs <deployment-url>
```

## Monitoring and Logs

### View Logs

1. Go to Vercel dashboard
2. Click on deployment
3. Click "Functions" tab
4. Select function to view logs

### Real-Time Logs

```bash
# Stream logs from CLI
vercel logs --follow
```

### Analytics

Vercel provides:
- Request analytics
- Function invocations
- Error rates
- Response times

Access via: Dashboard → Analytics

## Performance Optimization

### Cold Starts

Vercel functions have cold starts (first request slower). To minimize:

1. **Keep functions warm**: Set up Vercel Cron job to ping every 5 minutes
2. **Optimize imports**: Only import what you need
3. **Lazy load**: Load heavy dependencies on demand

### Caching

```typescript
// Add caching headers
export async function GET() {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 's-maxage=60, stale-while-revalidate'
    }
  });
}
```

### Edge Functions

For ultra-low latency, convert lightweight endpoints to Edge Functions:

```typescript
export const runtime = 'edge';

export async function GET() {
  // Fast edge function
}
```

**Note**: Edge Functions have limitations (no WebSockets, limited Node APIs).

## Scaling

### Free Tier Limits

- 100 GB-hours compute/month
- 100 GB bandwidth/month
- 6,000 build minutes/month
- 10 second function timeout

### Pro Plan ($20/month)

- Unlimited deployments
- 1 TB bandwidth
- 300 second function timeout
- Priority support

### When to Upgrade

Upgrade when you hit:
- 1000+ API calls/day
- Streaming sessions > 10 seconds
- Need faster build times

## Security Best Practices

### Environment Variables

- Never commit `.env` to git
- Rotate API keys regularly
- Use different keys for staging/production
- Audit access logs

### API Protection

Add rate limiting:
```typescript
// In API route
if (requests > RATE_LIMIT) {
  return NextResponse.json(
    { error: 'Rate limit exceeded' },
    { status: 429 }
  );
}
```

### CORS Configuration

Configure CORS in `next.config.js`:
```javascript
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: 'https://yourdomain.com' },
      ],
    },
  ];
}
```

## Maintenance

### Update Dependencies

```bash
# Check for updates
npm outdated

# Update
npm update

# Test locally
npm run build

# Deploy
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

### Monitor Costs

Check billing:
1. Vercel: Dashboard → Settings → Billing
2. Google Cloud: [console.cloud.google.com/billing](https://console.cloud.google.com/billing)
3. Pusher: Dashboard → Account → Billing

Set up budget alerts to avoid surprises.

## Rollback

If deployment has issues:

### Via Dashboard
1. Go to Deployments
2. Find previous working deployment
3. Click "⋯" → "Promote to Production"

### Via CLI
```bash
vercel rollback
```

## Support

### Vercel Issues
- Docs: [vercel.com/docs](https://vercel.com/docs)
- Support: help@vercel.com
- Community: [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)

### Application Issues
- Check `STREAMING_SETUP.md` for streaming issues
- Check `README.md` for API documentation
- Review logs in Vercel dashboard

## Checklist

Before going live:

- [ ] All environment variables configured
- [ ] API endpoints tested
- [ ] Streaming tested with real conversation
- [ ] Custom domain configured (if using)
- [ ] SSL certificate active
- [ ] Error monitoring set up
- [ ] Budget alerts configured
- [ ] Backup plan for rollback
- [ ] Documentation updated with production URLs

---

**Congratulations!** Your Japanese Bureaucracy Assistant is now live on Vercel with real-time streaming capabilities.

Next steps:
- Monitor performance in Vercel dashboard
- Set up alerts for errors
- Test with real users
- Iterate based on feedback
