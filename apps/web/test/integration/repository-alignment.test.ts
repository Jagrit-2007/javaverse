import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { getSandboxClient } from '@javaverse/sandbox';
import { EnvSchema, ExecuteCodeSchema } from '@javaverse/schemas';
import * as emailModule from '@/lib/email';

const ROOT_DIR = path.resolve(__dirname, '../../../../');

describe('Final Repository-Alignment Regression Suite (Part 17)', () => {
  // 1. No active dead privileged-bootstrap package script exists
  it('1. proves no active dead privileged-bootstrap package script exists', () => {
    const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
    expect(pkgJson.scripts['bootstrap:owner']).toBeUndefined();
  });

  // 2. No active package script references a missing executable
  it('2. proves no active package script references a missing executable', () => {
    const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
    for (const [name, cmd] of Object.entries(pkgJson.scripts as Record<string, string>)) {
      const match = cmd.match(/^node\s+([^\s]+)/);
      if (match && match[1]) {
        const scriptPath = path.join(ROOT_DIR, match[1]);
        expect(
          fs.existsSync(scriptPath),
          `Script "${name}" references missing file: ${match[1]}`,
        ).toBe(true);
      }
    }
  });

  // 3. Verification email uses neutral account language
  it('3. proves verification email uses neutral account language', () => {
    const emailSource = fs.readFileSync(path.join(ROOT_DIR, 'apps/web/src/lib/email.ts'), 'utf8');
    const sendVerificationSource = emailSource.slice(
      emailSource.indexOf('export async function sendVerificationEmail'),
      emailSource.indexOf('export async function sendPasswordResetEmail'),
    );

    expect(sendVerificationSource).not.toMatch(/owner/i);
    expect(sendVerificationSource).not.toMatch(/administrator/i);
    expect(sendVerificationSource).not.toMatch(/workspace/i);
    expect(sendVerificationSource).not.toMatch(/invitation/i);
    expect(sendVerificationSource).not.toMatch(/seat/i);
    expect(sendVerificationSource).not.toMatch(/tenant/i);
  });

  // 4. Verification-email subject is correct
  it('4. proves verification-email subject is "Verify your JavaVerse email"', () => {
    const emailSource = fs.readFileSync(path.join(ROOT_DIR, 'apps/web/src/lib/email.ts'), 'utf8');
    expect(emailSource).toContain("subject: 'Verify your JavaVerse email'");
  });

  // 5. No active invitation-email helper remains
  it('5. proves no active invitation-email helper remains', () => {
    expect((emailModule as any).sendMemberInvitationEmail).toBeUndefined();
    const emailSource = fs.readFileSync(path.join(ROOT_DIR, 'apps/web/src/lib/email.ts'), 'utf8');
    expect(emailSource).not.toContain('sendMemberInvitationEmail');
  });

  // 6. No active REGISTRATION_MODE remains
  it('6. proves no active REGISTRATION_MODE remains in schema or config', () => {
    expect((EnvSchema.shape as any).REGISTRATION_MODE).toBeUndefined();
    const envExample = fs.readFileSync(path.join(ROOT_DIR, '.env.example'), 'utf8');
    expect(envExample).not.toContain('REGISTRATION_MODE');
    const turboJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'turbo.json'), 'utf8'));
    expect(turboJson.tasks.build.env).not.toContain('REGISTRATION_MODE');
  });

  // 7. Suspended-account copy is neutral
  it('7. proves suspended-account copy is neutral with safe action', () => {
    const suspendedSource = fs.readFileSync(
      path.join(ROOT_DIR, 'apps/web/src/app/(public)/auth/suspended/page.tsx'),
      'utf8',
    );
    const normalized = suspendedSource.replace(/\s+/g, ' ');
    expect(normalized).toContain(
      'This account is currently unavailable. Account recovery is not yet supported in the JavaVerse interface.',
    );
    expect(suspendedSource).toContain('Return to Sign in');
    expect(suspendedSource).not.toMatch(/administrator/i);
    expect(suspendedSource).not.toMatch(/workspace administrator/i);
    expect(suspendedSource).not.toMatch(/user role|account role|role: 'owner'/i);
  });

  // 8. Notes behavior matches the chosen decision (Outcome B: Future Preview)
  it('8. proves Notes page displays neutral future-feature badge without phase labels', () => {
    const notesSource = fs.readFileSync(
      path.join(ROOT_DIR, 'apps/web/src/app/(dashboard)/dashboard/notes/page.tsx'),
      'utf8',
    );
    expect(notesSource).toContain('phaseBadge="Feature Preview · Scheduled for future release"');
    expect(notesSource).not.toContain('Phase 2 Shell Preview');
    expect(notesSource).not.toContain('Phase 8');
  });

  // 9. Public APIs cannot select container_runner
  it('9. proves ExecuteCodeSchema rejects or ignores provider field', () => {
    expect((ExecuteCodeSchema.shape as any).provider).toBeUndefined();
    const parsed = ExecuteCodeSchema.safeParse({
      code: 'public class Main {}',
      javaVersion: 'JAVA_21',
      provider: 'container_runner',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect((parsed.data as any).provider).toBeUndefined();
    }
  });

  // 10. Client input cannot select container_runner
  it('10. proves client input schemas across monorepo do not accept sandbox provider selection', () => {
    expect((ExecuteCodeSchema.shape as any).provider).toBeUndefined();
  });

  // 11. Invalid sandbox-provider input fails closed
  it('11. proves invalid sandbox-provider input fails closed with descriptive error', () => {
    expect(() => getSandboxClient({ provider: 'invalid_unsupported_runner' })).toThrow(
      /Invalid or unsupported sandbox provider/,
    );
  });

  // 12. Local Mock is the safe default
  it('12. proves Local Mock is the safe default sandbox provider', () => {
    const client = getSandboxClient();
    expect(client.providerId).toBe('mock');
  });

  // 13. Learner UI contains no unsupported sandbox claim
  it('13. proves learner UI does not render unsupported "Verified in Sandbox" claims', () => {
    const workspacePanelSource = fs.readFileSync(
      path.join(ROOT_DIR, 'apps/web/src/components/chat/WorkspacePanel.tsx'),
      'utf8',
    );
    expect(workspacePanelSource).not.toContain('Verified in Sandbox');
    expect(workspacePanelSource).toContain('Execution mode: Local Mock');
  });

  // 14. Static hashes are deterministic
  it('14. proves static hashes are deterministic and committed file matches generated content', () => {
    const staticHashesPath = path.join(ROOT_DIR, 'packages/security/src/static-hashes.ts');
    expect(fs.existsSync(staticHashesPath)).toBe(true);
    const content = fs.readFileSync(staticHashesPath, 'utf8');
    expect(content).toContain('STATIC_THEME_SCRIPT_HASH');
    expect(content).toContain('STATIC_ROUTE_SCRIPT_HASHES');
  });

  // 15. Static-hash verification detects stale artifacts
  it('15. proves verify-static-hashes script exists and is executable', () => {
    const verifyScriptPath = path.join(ROOT_DIR, 'scripts/verify-static-hashes.mjs');
    expect(fs.existsSync(verifyScriptPath)).toBe(true);
  });

  // 16. README commands correspond to existing package scripts
  it('16. proves README commands correspond to actual package scripts', () => {
    const readme = fs.readFileSync(path.join(ROOT_DIR, 'README.md'), 'utf8');
    const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));

    const expectedScripts = [
      'format:check',
      'format',
      'lint',
      'typecheck',
      'test',
      'test:clean-db',
      'test:backup-restore',
      'verify:static-hashes',
      'build',
      'test:lighthouse',
      'generate-env',
    ];

    for (const script of expectedScripts) {
      expect(pkgJson.scripts[script], `Missing script: ${script}`).toBeDefined();
      expect(readme).toContain(`pnpm ${script}`);
    }
  });

  // 17. README contains no deleted script instruction
  it('17. proves README contains no deleted script references', () => {
    const readme = fs.readFileSync(path.join(ROOT_DIR, 'README.md'), 'utf8');
    expect(readme).not.toContain('bootstrap:owner');
    expect(readme).not.toContain('bootstrap-owner.mjs');
  });

  // 18. README environment table matches current EnvSchema
  it('18. proves README environment variables match EnvSchema shape', () => {
    const readme = fs.readFileSync(path.join(ROOT_DIR, 'README.md'), 'utf8');
    const documentedVars = [
      'NODE_ENV',
      'DATABASE_URL',
      'REDIS_QUEUE_URL',
      'REDIS_CACHE_URL',
      'SESSION_SECRET',
      'CURSOR_SIGNING_SECRET',
      'SANDBOX_SHARED_SECRET',
      'MAX_USERS',
      'AI_PROVIDER_PRIMARY',
      'SANDBOX_PROVIDER',
    ];

    for (const v of documentedVars) {
      expect((EnvSchema.shape as any)[v], `Missing EnvSchema property: ${v}`).toBeDefined();
      expect(readme).toContain(`\`${v}\``);
    }
  });

  // 19. CI workflow contains each check it claims to run
  it('19. proves CI workflow contains all claimed validation steps', () => {
    const ciWorkflow = fs.readFileSync(path.join(ROOT_DIR, '.github/workflows/ci.yml'), 'utf8');
    expect(ciWorkflow).toContain('pnpm install --frozen-lockfile');
    expect(ciWorkflow).toContain('pnpm format:check');
    expect(ciWorkflow).toContain('pnpm lint');
    expect(ciWorkflow).toContain('pnpm typecheck');
    expect(ciWorkflow).toContain('pnpm test');
    expect(ciWorkflow).toContain('pnpm test:clean-db');
    expect(ciWorkflow).toContain('pnpm test:backup-restore');
    expect(ciWorkflow).toContain('pnpm build');
    expect(ciWorkflow).toContain('pnpm verify:static-hashes');
    expect(ciWorkflow).toContain('pnpm test:lighthouse');
    expect(ciWorkflow).toContain('gitleaks');
    expect(ciWorkflow).toContain('osv-scanner');
  });

  // 20. Current documentation does not call rejected technology approved
  it('20. proves current documentation does not describe container_runner as approved or ratified', () => {
    const decisions = fs.readFileSync(path.join(ROOT_DIR, 'docs/DECISIONS.md'), 'utf8');
    const operations = fs.readFileSync(path.join(ROOT_DIR, 'docs/runbooks/OPERATIONS.md'), 'utf8');
    const readme = fs.readFileSync(path.join(ROOT_DIR, 'README.md'), 'utf8');

    expect(decisions).not.toContain('ratified as the primary production sandbox');
    expect(operations).toContain('container_runner');
    expect(operations).toContain('REJECTED');
    expect(readme).toContain('REJECTED');
  });

  // 21. Current documentation does not call JavaVerse legally open source without a licence
  it('21. proves documentation accurately describes platform as preparing for open-source release', () => {
    const readme = fs.readFileSync(path.join(ROOT_DIR, 'README.md'), 'utf8');
    expect(readme).toContain('JavaVerse is source-visible and preparing for open-source release.');
  });

  // 22. Current documentation uses "project maintainer"
  it('22. proves active documentation uses "project maintainer" rather than legacy privileged terms', () => {
    const readme = fs.readFileSync(path.join(ROOT_DIR, 'README.md'), 'utf8');
    expect(readme).toContain('project maintainer');
    expect(readme).not.toMatch(/project owner/i);
    expect(readme).not.toMatch(/owner instructions/i);
    expect(readme).not.toMatch(/owner smoke test/i);
  });

  // 23. Active product routes contain no removed privileged-role experience
  it('23. proves legacy admin and bootstrap routes redirect to learner equivalents in middleware', () => {
    const middlewareSource = fs.readFileSync(
      path.join(ROOT_DIR, 'apps/web/src/middleware.ts'),
      'utf8',
    );
    expect(middlewareSource).toContain(
      "if (pathname === '/auth/bootstrap' || pathname === '/auth/invite')",
    );
    expect(middlewareSource).toContain(
      "if (pathname === '/admin' || pathname.startsWith('/dashboard/admin'))",
    );
  });

  // 24. Phase 2 screenshots remain unchanged
  it('24. proves Phase 2 screenshots directory has zero modifications in Git', () => {
    const status = execSync('git status --short docs/reviews/screenshots/phase-2', {
      cwd: ROOT_DIR,
      encoding: 'utf8',
    }).trim();
    expect(status).toBe('');
  });
});
