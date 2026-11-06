import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { AskWorkspace } from '@/components/chat/AskWorkspace';

export const metadata: Metadata = {
  title: 'Ask JavaVerse — JavaVerse',
  description: 'AI-assisted Java reasoning, solutions, and interactive concept visualizations.',
};

export default function DashboardAskPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem' }}>Loading workspace...</div>}>
      <AskWorkspace />
    </Suspense>
  );
}
