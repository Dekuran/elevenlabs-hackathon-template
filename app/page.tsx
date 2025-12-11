export default function Home() {
  return (
    <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Japanese Bureaucracy Assistant</h1>
      <p>
        Backend API for two-agent Japanese bureaucracy assistance system.
      </p>

      <div style={{ padding: '1rem', background: '#e3f2fd', marginBottom: '2rem', borderRadius: '4px' }}>
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>🧪 Test the API:</strong>{' '}
          <a href="/test" style={{ color: '#2196f3' }}>Open Testing Interface →</a>
        </div>
        <div>
          <strong>📡 Test Real-Time Streaming:</strong>{' '}
          <a href="/stream-test" style={{ color: '#2196f3' }}>Live Transcription →</a>
        </div>
      </div>
      <h2>API Endpoints</h2>
      <ul>
        <li>
          <code>POST /api/analyzeLetter</code> - Analyze Japanese documents
        </li>
        <li>
          <code>POST /api/updateUserProfile</code> - Update user information
        </li>
        <li>
          <code>POST /api/prepareCall</code> - Prepare Japanese Agent call
        </li>
        <li>
          <code>POST /api/requestUserInfoTool</code> - Request user info (Japanese Agent tool)
        </li>
        <li>
          <code>POST /api/analyzeIdDocument</code> - Analyze ID documents (English Agent tool)
        </li>
        <li>
          <code>POST /api/resolveUserInfo</code> - Resolve user info (English Agent tool)
        </li>
        <li>
          <code>GET /api/getSessionStatus</code> - Get session status
        </li>
        <li>
          <code>POST /api/summarizeCall</code> - Summarize call transcript
        </li>
        <li>
          <code>POST /api/startStream</code> - Start real-time stream (Pusher bridge)
        </li>
        <li>
          <code>POST /api/stopStream</code> - Stop real-time stream
        </li>
      </ul>
      <p>
        See <code>README.md</code> for full documentation.
      </p>
    </main>
  );
}
