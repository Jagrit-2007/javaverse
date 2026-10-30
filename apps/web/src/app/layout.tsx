import type { Metadata } from 'next';
import '@/styles/globals.css';
import { ThemeScript } from '@/components/theme/ThemeScript';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { SkipLink } from '@/components/ui/SkipLink';

export const metadata: Metadata = {
  title: {
    default: 'JavaVerse — Learn Java. Build Your Thinking.',
    template: '%s | JavaVerse',
  },
  description:
    'Open-source, self-hosted, visual-first Java learning platform. Master concepts through interactive intuition and practical problem solving.',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <SkipLink targetId="main-content" />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
