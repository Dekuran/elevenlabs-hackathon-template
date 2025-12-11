'use client';

import { useState } from 'react';

export default function TestPage() {
  const [sessionId, setSessionId] = useState('demo');
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

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

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>API Testing Interface</h1>

      <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f5f5f5' }}>
        <label>
          Session ID:{' '}
          <input
            type="text"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            style={{ marginLeft: '0.5rem', padding: '0.25rem' }}
          />
        </label>
      </div>

      <div style={{ display: 'grid', gap: '2rem' }}>
        <EndpointTester
          title="1. Analyze Letter"
          description="Upload and analyze Japanese document"
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
          description="Update user information"
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
          description="Generate call context for Japanese Agent"
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
          description="Check current session state"
          onTest={() =>
            apiCall(
              'sessionStatus',
              `/api/getSessionStatus?sessionId=${sessionId}`,
              'GET'
            )
          }
          response={responses.sessionStatus}
          loading={loading.sessionStatus}
        />

        <EndpointTester
          title="5. Request User Info (Japanese Agent Tool)"
          description="Japanese Agent requests missing information"
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
          title="6. Analyze ID Document (English Agent Tool)"
          description="Extract information from ID card"
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
          description="Store gathered information and resume call"
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
          description="Prepare to resume Japanese Agent with new info"
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
          description="Generate call summary from transcript"
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

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#e3f2fd' }}>
        <h3>Quick Workflow Test</h3>
        <p>Click these in order to test the complete two-agent handoff:</p>
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
              `/api/getSessionStatus?sessionId=${sessionId}`,
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
              `/api/getSessionStatus?sessionId=${sessionId}`,
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
