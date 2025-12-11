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
      <body>{children}</body>
    </html>
  );
}
