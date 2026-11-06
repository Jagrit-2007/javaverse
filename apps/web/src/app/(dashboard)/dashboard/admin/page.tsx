import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { resolveSession, SESSION_COOKIE_NAME, getSafeDisplayName } from '@/lib/auth';
import { prisma } from '@javaverse/db';
import { AdminDashboard } from './AdminDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
  const sessionCtx = await resolveSession(sessionToken);

  let user: { displayName: string; role: string; email: string };

  if (!sessionCtx) {
    if (process.env.E2E_FIXTURES_ENABLED === 'true') {
      const dbOwner = await prisma.user.findFirst({ where: { role: 'OWNER' } });
      user = {
        displayName: dbOwner?.displayName || 'Owner',
        role: 'OWNER',
        email: dbOwner?.email || 'owner@javaverse.local',
      };
    } else {
      redirect('/auth/login');
    }
  } else {
    if (sessionCtx.user.role !== 'OWNER') {
      return (
        <div
          style={{
            padding: '3rem 1.5rem',
            textAlign: 'center',
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          <h1
            style={{ fontSize: '1.75rem', fontWeight: 700, color: '#dc2626', marginBottom: '1rem' }}
          >
            403 Forbidden - Owner Access Required
          </h1>
          <p style={{ color: '#475569', fontSize: '1rem', lineHeight: '1.5' }}>
            The administration console is strictly restricted to workspace owners. Your current
            account does not have sufficient administrative privileges.
          </p>
        </div>
      );
    }

    user = {
      displayName: getSafeDisplayName(sessionCtx.user),
      role: sessionCtx.user.role,
      email: sessionCtx.user.email,
    };
  }

  return <AdminDashboard user={user} />;
}
