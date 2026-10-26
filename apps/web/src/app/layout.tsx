import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'JavaVerse',
  description: 'Learn Java. Build Your Thinking.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
