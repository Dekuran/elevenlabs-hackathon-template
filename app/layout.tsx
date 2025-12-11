import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Japanese Bureaucracy Assistant',
  description: 'AI-powered assistant for navigating Japanese government paperwork',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, system-ui, -system-ui, 'Segoe UI', sans-serif",
          backgroundColor: '#f5f5f5',
        }}
      >
        <header
          style={{
            backgroundColor: '#0d47a1',
            color: 'white',
            padding: '0.75rem 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          }}
        >
          <div style={{ fontWeight: 600 }}>
            Japanese Bureaucracy Assistant
          </div>
          <nav
            style={{
              display: 'flex',
              gap: '1.25rem',
              fontSize: '0.9rem',
            }}
          >
            <a
              href="/"
              style={{ color: 'white', textDecoration: 'none' }}
            >
              Overview
            </a>
            <a
              href="/test"
              style={{ color: 'white', textDecoration: 'none' }}
            >
              API Playground
            </a>
            <a
              href="/stream-test"
              style={{ color: 'white', textDecoration: 'none' }}
            >
              Live Stream
            </a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
