'use client';

import { useState, useEffect, ChangeEvent } from 'react';

type ApiResponses = Record<string, any>;
type LoadingState = Record<string, boolean>;

function EndpointTester({
  title,
  description,
  onTest,
  response,
  loading,
}: {
  title: string;
  description: string;
  onTest: () => void;
  response?: any;
  loading?: boolean;
}) {
  return (
    <div
      style={{
        border: '1px solid #ddd',
        padding: '1rem',
        borderRadius: '4px',
      }}
    >
      <h3 style={{ margin: '0 0 0.5rem 0' }}>{title}</h3>
      <p style={{ margin: '0 0 1rem 0', color: '#666' }}>{description}</p>

      <button
        onClick={onTest}
        disabled={loading}
        style={{
          padding: '0.5rem 1rem',
          background: loading ? '#ccc' : '#4caf50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Loading...' : 'Test'}
      </button>

      {response && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: '#f5f5f5',
            borderRadius: '4px',
            fontSize: '0.875rem',
          }}
        >
          <strong>Response:</strong>
          <pre
            style={{
              margin: '0.5rem 0 0 0',
              overflow: 'auto',
              maxHeight: '200px',
            }}
          >
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function TestPage() {
  const [sessionId, setSessionId] = useState('demo');
  const [responses, setResponses] = useState<ApiResponses>({});
  const [loading, setLoading] = useState<LoadingState>({});
  const [sessionStatus, setSessionStatus] = useState<any | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [letterFileName, setLetterFileName] = useState<string | null>(null);
  const [idFileName, setIdFileName] = useState<string | null>(null);

  const addResponse = (key: string, data: any) => {
    setResponses((prev) => ({ ...prev, [key]: data }));
  };

  const setLoadingState = (key: string, isLoading: boolean) => {
    setLoading((prev) => ({ ...prev, [key]: isLoading }));
  };

  const apiCall = async (
    key: string,
    endpoint: string,
    method: string,
    body?: any
  ) => {
    setLoadingState(key, true);
    try {
      const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (body) options.body = JSON.stringify(body);

      const response = await fetch(endpoint, options);
      const data = await response.json();
      addResponse(key, { status: response.status, data });
    } catch (error: any) {
      addResponse(key, { error: error.message });
    } finally {
      setLoadingState(key, false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const fetchSessionStatus = async () => {
    setStatusLoading(true);
    try {
      const res = await fetch(
        `/api/getSessionStatus?sessionId=${encodeURIComponent(sessionId)}`
      );
      const data = await res.json();
      setSessionStatus(data);
    } catch (error) {
      console.error('Failed to fetch session status', error);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleLetterFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLetterFileName(file.name);
    await apiCall('analyzeLetterUpload', '/api/analyzeLetter', 'POST', {
      sessionId,
      imageBase64: await fileToBase64(file),
    });
    await fetchSessionStatus();
  };

  const handleIdFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIdFileName(file.name);
    await apiCall('analyzeIdUpload', '/api/analyzeIdDocument', 'POST', {
      sessionId,
      imageBase64: await fileToBase64(file),
      extractField: 'all',
    });
    await fetchSessionStatus();
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>API Testing Interface</h1>

      <div
        style={{ marginBottom: '2rem', padding: '1rem', background: '#f5f5f5' }}
      >
        <label>
          Session ID:{' '}
          <input
            type="text"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            style={{ marginLeft: '0.5rem', padding: '0.25rem' }}
          />
        </label>
        <p
          style={{
            marginTop: '0.5rem',
            fontSize: '0.875rem',
            color: '#666',
          }}
        >
          All calls below will read and update in-memory session state for this
          ID.
        </p>
      </div>

      <div
        style={{
          border: '1px solid #ddd',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '2rem',
          background: '#fff',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Photo Upload Flows</h2>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          These call the real photo-based APIs:
          <code> POST /api/analyzeLetter</code> and
          <code> POST /api/analyzeIdDocument</code>, sending base64-encoded
          images and updating the shared session context.
        </p>

        <div
          style={{
            display: 'grid',
            gap: '1.5rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          }}
        >
          <div
            style={{
              border: '1px solid #eee',
              padding: '1rem',
              borderRadius: '4px',
              background: '#fafafa',
            }}
          >
            <h3 style={{ marginTop: 0 }}>Analyze Japanese Letter</h3>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>
              Upload a Japanese pension notice or similar document. The backend
              will parse it and store a <code>CaseDocument</code> in the
              session.
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleLetterFileChange}
              disabled={loading.analyzeLetterUpload}
              style={{ marginTop: '0.5rem' }}
            />
            {letterFileName && (
              <p
                style={{
                  marginTop: '0.5rem',
                  fontSize: '0.8rem',
                  color: '#555',
                }}
              >
                Selected: {letterFileName}
              </p>
            )}
            <p
              style={{
                marginTop: '0.5rem',
                fontSize: '0.8rem',
                color: '#999',
              }}
            >
              Status:{' '}
              {loading.analyzeLetterUpload
                ? 'Uploading and analyzing...'
                : responses.analyzeLetterUpload
                ? 'Done (see response panel below)'
                : 'Idle'}
            </p>
          </div>

          <div
            style={{
              border: '1px solid #eee',
              padding: '1rem',
              borderRadius: '4px',
              background: '#fafafa',
            }}
          >
            <h3 style={{ marginTop: 0 }}>Analyze ID Document</h3>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>
              Upload a residence card or pension ID. The backend will run the ID
              analysis tool and return structured fields (stubbed Gemini
              Vision).
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleIdFileChange}
              disabled={loading.analyzeIdUpload}
              style={{ marginTop: '0.5rem' }}
            />
            {idFileName && (
              <p
                style={{
                  marginTop: '0.5rem',
                  fontSize: '0.8rem',
                  color: '#555',
                }}
              >
                Selected: {idFileName}
              </p>
            )}
            <p
              style={{
                marginTop: '0.5rem',
                fontSize: '0.8rem',
                color: '#999',
              }}
            >
              Status:{' '}
              {loading.analyzeIdUpload
                ? 'Uploading and analyzing...'
                : responses.analyzeIdUpload
                ? 'Done (see response panel below)'
                : 'Idle'}
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '2rem' }}>
        <EndpointTester
          title="1. Analyze Letter (stubbed image)"
          description="Call /api/analyzeLetter with a fake base64 payload (no real file required)"
          onTest={() =>
            apiCall('analyzeLetter', '/api/analyzeLetter', 'POST', {
              sessionId,
              imageBase64: 'fake_base64_image_data',
            })
          }
          response={responses.analyzeLetter}
          loading={loading.analyzeLetter}
        />

        <EndpointTester
          title="2. Update User Profile"
          description="Update user information stored in the session"
          onTest={() =>
            apiCall('updateProfile', '/api/updateUserProfile', 'POST', {
              sessionId,
              patch: {
                name: 'John Smith',
                country: 'UK',
                homePensionSystem: 'National Insurance',
                hasBilateralAgreement: true,
              },
            })
          }
          response={responses.updateProfile}
          loading={loading.updateProfile}
        />

        <EndpointTester
          title="3. Prepare Call"
          description="Generate call context for Japanese Agent using current document & profile"
          onTest={() =>
            apiCall('prepareCall', '/api/prepareCall', 'POST', {
              sessionId,
              documentId: 'doc_1',
              isResume: false,
            })
          }
          response={responses.prepareCall}
          loading={loading.prepareCall}
        />

        <EndpointTester
          title="4. Get Session Status"
          description="Check current session state and coordination flags"
          onTest={() =>
            apiCall(
              'sessionStatus',
              `/api/getSessionStatus?sessionId=${encodeURIComponent(
                sessionId
              )}`,
              'GET'
            )
          }
          response={responses.sessionStatus}
          loading={loading.sessionStatus}
        />

        <EndpointTester
          title="5. Request User Info (Japanese Agent Tool)"
          description="Simulate the Japanese Agent pausing to request missing information"
          onTest={() =>
            apiCall('requestInfo', '/api/requestUserInfoTool', 'POST', {
              sessionId,
              field: 'residence_card_number',
              reason: 'Pension office requires residence card for verification',
            })
          }
          response={responses.requestInfo}
          loading={loading.requestInfo}
        />

        <EndpointTester
          title="6. Analyze ID Document (English Agent Tool, stubbed image)"
          description="Extract information from ID card using fake base64 payload"
          onTest={() =>
            apiCall('analyzeId', '/api/analyzeIdDocument', 'POST', {
              sessionId,
              imageBase64: 'fake_residence_card_image',
              extractField: 'residence_card_number',
            })
          }
          response={responses.analyzeId}
          loading={loading.analyzeId}
        />

        <EndpointTester
          title="7. Resolve User Info (English Agent Tool)"
          description="Store gathered information and mark session as ready to resume"
          onTest={() =>
            apiCall('resolveInfo', '/api/resolveUserInfo', 'POST', {
              sessionId,
              field: 'residence_card_number',
              value: 'A1234567890',
            })
          }
          response={responses.resolveInfo}
          loading={loading.resolveInfo}
        />

        <EndpointTester
          title="8. Prepare Resume Call"
          description="Prepare to resume Japanese Agent with newly provided information"
          onTest={() =>
            apiCall('prepareResume', '/api/prepareCall', 'POST', {
              sessionId,
              documentId: 'doc_1',
              isResume: true,
            })
          }
          response={responses.prepareResume}
          loading={loading.prepareResume}
        />

        <EndpointTester
          title="9. Summarize Call"
          description="Generate call summary and next steps from a transcript"
          onTest={() =>
            apiCall('summarize', '/api/summarizeCall', 'POST', {
              sessionId,
              transcript:
                'Agent called pension office. Explained situation. Office agreed to review exemption request.',
            })
          }
          response={responses.summarize}
          loading={loading.summarize}
        />
      </div>

      <div
        style={{
          marginTop: '2rem',
          padding: '1rem',
          background: '#fff3e0',
          borderRadius: '4px',
          border: '1px solid #ffe0b2',
        }}
      >
        <h3>Session Context Inspector</h3>
        <p style={{ fontSize: '0.9rem', color: '#666' }}>
          This reads from <code>/api/getSessionStatus</code> so you can see how
          calls above update in-memory context: user profile, documents, and
          coordination flags.
        </p>
        <button
          onClick={fetchSessionStatus}
          disabled={statusLoading}
          style={{
            padding: '0.5rem 1rem',
            background: statusLoading ? '#ccc' : '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: statusLoading ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
          }}
        >
          {statusLoading ? 'Refreshing…' : 'Refresh session status'}
        </button>

        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: '#fff',
            borderRadius: '4px',
            border: '1px solid #eee',
            maxHeight: '260px',
            overflow: 'auto',
          }}
        >
          {sessionStatus ? (
            <pre
              style={{
                margin: 0,
                fontSize: '0.8rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {JSON.stringify(sessionStatus, null, 2)}
            </pre>
          ) : (
            <p style={{ fontSize: '0.85rem', color: '#999' }}>
              No session data loaded yet. Click <strong>Refresh session
              status</strong> after making some API calls.
            </p>
          )}
        </div>
      </div>

      <div
        style={{ marginTop: '2rem', padding: '1rem', background: '#e3f2fd' }}
      >
        <h3>Quick Workflow Test</h3>
        <p>Click this button to run the complete two-agent handoff sequence.</p>
        <button
          onClick={async () => {
            await apiCall('analyzeLetter', '/api/analyzeLetter', 'POST', {
              sessionId,
              imageBase64: 'fake_base64_image_data',
            });
            await new Promise((r) => setTimeout(r, 500));
            await apiCall('updateProfile', '/api/updateUserProfile', 'POST', {
              sessionId,
              patch: { name: 'John Smith', country: 'UK' },
            });
            await new Promise((r) => setTimeout(r, 500));
            await apiCall('prepareCall', '/api/prepareCall', 'POST', {
              sessionId,
              documentId: 'doc_1',
              isResume: false,
            });
            await new Promise((r) => setTimeout(r, 500));
            await apiCall('requestInfo', '/api/requestUserInfoTool', 'POST', {
              sessionId,
              field: 'residence_card_number',
              reason: 'Verification needed',
            });
            await new Promise((r) => setTimeout(r, 500));
            await apiCall(
              'sessionStatus',
              `/api/getSessionStatus?sessionId=${encodeURIComponent(
                sessionId
              )}`,
              'GET'
            );
            await new Promise((r) => setTimeout(r, 500));
            await apiCall('analyzeId', '/api/analyzeIdDocument', 'POST', {
              sessionId,
              imageBase64: 'fake_id',
              extractField: 'residence_card_number',
            });
            await new Promise((r) => setTimeout(r, 500));
            await apiCall('resolveInfo', '/api/resolveUserInfo', 'POST', {
              sessionId,
              field: 'residence_card_number',
              value: 'A1234567890',
            });
            await new Promise((r) => setTimeout(r, 500));
            await apiCall(
              'sessionStatus',
              `/api/getSessionStatus?sessionId=${encodeURIComponent(
                sessionId
              )}`,
              'GET'
            );
            await new Promise((r) => setTimeout(r, 500));
            await apiCall('prepareResume', '/api/prepareCall', 'POST', {
              sessionId,
              documentId: 'doc_1',
              isResume: true,
            });
            await new Promise((r) => setTimeout(r, 500));
            await apiCall('summarize', '/api/summarizeCall', 'POST', {
              sessionId,
              transcript: 'Call completed successfully',
            });
            await fetchSessionStatus();
          }}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          Run Complete Workflow
        </button>
      </div>
    </div>
  );
}
