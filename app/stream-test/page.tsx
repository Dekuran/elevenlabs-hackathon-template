'use client';

import { useState, useEffect, useRef } from 'react';
import { CallStreamClient, TranscriptMessage } from '@/lib/callStream';

type Message = {
  speaker: 'agent' | 'operator';
  text_ja: string;
  text_en: string | null;
  is_final: boolean;
  timestamp: number;
};

export default function StreamTestPage() {
  const [sessionId, setSessionId] = useState('demo');
  const [conversationId, setConversationId] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [status, setStatus] = useState<string>('disconnected');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentPartial, setCurrentPartial] = useState<Message | null>(null);
  const streamClient = useRef<CallStreamClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentPartial]);

  const startStream = () => {
    if (!conversationId.trim()) {
      alert('Please enter a conversation ID');
      return;
    }

    setIsStreaming(true);
    setMessages([]);
    setCurrentPartial(null);
    setStatus('connecting');

    streamClient.current = new CallStreamClient(
      conversationId,
      sessionId,
      {
        onTranscript: (msg: TranscriptMessage) => {
          if (msg.is_final) {
            setMessages((prev) => [...prev, msg]);
            setCurrentPartial(null);
          } else {
            setCurrentPartial(msg);
          }
        },
        onStatus: (msg) => {
          setStatus(msg.status);
        },
        onError: (error) => {
          console.error('Stream error:', error);
          setStatus('error');
        },
      }
    );
  };

  const stopStream = async () => {
    if (streamClient.current) {
      await streamClient.current.disconnect();
      streamClient.current = null;
    }
    setIsStreaming(false);
    setStatus('disconnected');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Live Call Stream Test</h1>
      <p>Test real-time transcription and translation from ElevenLabs agent calls</p>

      <div
        style={{
          marginBottom: '2rem',
          padding: '1rem',
          background: '#f5f5f5',
          borderRadius: '8px',
        }}
      >
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Session ID:
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              disabled={isStreaming}
              style={{
                marginLeft: '0.5rem',
                padding: '0.5rem',
                width: '200px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Conversation ID (from ElevenLabs):
            <input
              type="text"
              value={conversationId}
              onChange={(e) => setConversationId(e.target.value)}
              disabled={isStreaming}
              placeholder="conv_xxxxxxxxxx"
              style={{
                marginLeft: '0.5rem',
                padding: '0.5rem',
                width: '300px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            onClick={startStream}
            disabled={isStreaming}
            style={{
              padding: '0.75rem 1.5rem',
              background: isStreaming ? '#ccc' : '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isStreaming ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
            }}
          >
            Start Stream
          </button>

          <button
            onClick={stopStream}
            disabled={!isStreaming}
            style={{
              padding: '0.75rem 1.5rem',
              background: !isStreaming ? '#ccc' : '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: !isStreaming ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
            }}
          >
            Stop Stream
          </button>

          <div
            style={{
              padding: '0.5rem 1rem',
              background:
                status === 'connected' || status === 'active'
                  ? '#4caf50'
                  : status === 'error'
                  ? '#f44336'
                  : '#757575',
              color: 'white',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}
          >
            Status: {status}
          </div>
        </div>
      </div>

      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '1rem',
          height: '600px',
          overflowY: 'auto',
          background: '#fafafa',
        }}
      >
        <h3 style={{ marginTop: 0 }}>Live Transcript</h3>

        {messages.length === 0 && !currentPartial && (
          <p style={{ color: '#999', textAlign: 'center', marginTop: '3rem' }}>
            No messages yet. Start streaming to see transcripts appear here.
          </p>
        )}

        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}

        {currentPartial && <MessageBubble message={currentPartial} isPartial />}

        <div ref={messagesEndRef} />
      </div>

      <div
        style={{
          marginTop: '2rem',
          padding: '1rem',
          background: '#e3f2fd',
          borderRadius: '8px',
        }}
      >
        <h3>How to Use:</h3>
        <ol>
          <li>
            Set up Pusher credentials in <code>.env</code> (see README.md)
          </li>
          <li>Start an ElevenLabs conversation and get the conversation ID</li>
          <li>Paste the conversation ID above</li>
          <li>Click "Start Stream"</li>
          <li>Watch live transcription and translation appear below</li>
        </ol>

        <h4>Color Legend:</h4>
        <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '20px',
                height: '20px',
                background: '#e3f2fd',
                border: '2px solid #2196f3',
                borderRadius: '4px',
              }}
            />
            <span>Agent (Japanese AI calling operator)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '20px',
                height: '20px',
                background: '#f3e5f5',
                border: '2px solid #9c27b0',
                borderRadius: '4px',
              }}
            />
            <span>Operator (Human at pension office)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isPartial = false,
}: {
  message: Message;
  isPartial?: boolean;
}) {
  const isAgent = message.speaker === 'agent';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isAgent ? 'flex-start' : 'flex-end',
        marginBottom: '1rem',
      }}
    >
      <div
        style={{
          maxWidth: '70%',
          padding: '1rem',
          borderRadius: '12px',
          background: isAgent ? '#e3f2fd' : '#f3e5f5',
          border: isAgent ? '2px solid #2196f3' : '2px solid #9c27b0',
          opacity: isPartial ? 0.7 : 1,
        }}
      >
        <div
          style={{
            fontSize: '0.75rem',
            fontWeight: 'bold',
            color: isAgent ? '#1976d2' : '#7b1fa2',
            marginBottom: '0.5rem',
          }}
        >
          {isAgent ? '🤖 Agent' : '👤 Operator'}
          {isPartial && ' (typing...)'}
        </div>

        <div style={{ marginBottom: '0.5rem' }}>
          <div
            style={{
              fontSize: '0.75rem',
              color: '#666',
              marginBottom: '0.25rem',
            }}
          >
            Japanese:
          </div>
          <div style={{ fontSize: '1rem' }}>{message.text_ja}</div>
        </div>

        {message.text_en && (
          <div>
            <div
              style={{
                fontSize: '0.75rem',
                color: '#666',
                marginBottom: '0.25rem',
              }}
            >
              English:
            </div>
            <div style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>
              {message.text_en}
            </div>
          </div>
        )}

        {!message.text_en && !isPartial && (
          <div style={{ fontSize: '0.875rem', color: '#999', fontStyle: 'italic' }}>
            Translating...
          </div>
        )}
      </div>
    </div>
  );
}
