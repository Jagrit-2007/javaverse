import { test, expect } from '@playwright/test';
import { authenticateAsLearner } from './helpers/auth';

const PUBLIC_ROUTES = ['/', '/learn', '/about', '/privacy', '/terms', '/contact'];

const DASHBOARD_ROUTES = [
  '/dashboard',
  '/dashboard/learn',
  '/dashboard/practice',
  '/dashboard/ask',
  '/dashboard/library',
  '/dashboard/progress',
  '/dashboard/notes',
  '/dashboard/settings',
];

test.describe('Public Route Navigation & Headings', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`route ${route} loads successfully with unique h1 and landmark`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      const response = await page.goto(route);
      expect(response?.status()).toBe(200);

      // Verify unique h1
      await expect(page.locator('h1')).toHaveCount(1);

      // Verify unique main landmark
      await expect(page.locator('main')).toHaveCount(1);

      // Verify no console errors or CSP violations
      const cspErrors = consoleErrors.filter(
        (err) =>
          err.toLowerCase().includes('content security policy') ||
          err.toLowerCase().includes('csp') ||
          err.toLowerCase().includes('violates'),
      );
      expect(cspErrors).toEqual([]);
    });
  }

  test('public route / response headers enforce static hash CSP', async ({ request }) => {
    const res = await request.get('/');
    expect(res.status()).toBe(200);
    const csp = res.headers()['content-security-policy'] ?? '';
    expect(csp).toContain("'sha256-uzc/ICGCVhC9uE7iS0jwoALziW9F9jnNPGlor+yZDuk='");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  test('public landing CTAs and footer Demo Dashboard route correctly', async ({
    page,
    context,
  }) => {
    await authenticateAsLearner(context);
    await page.goto('/');

    // Footer Demo Dashboard CTA
    const footerCta = page.locator('footer a:has-text("Demo Dashboard")');
    await expect(footerCta).toBeVisible();
    await footerCta.click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('public landing Preview Curriculum CTA routes to public /learn', async ({ page }) => {
    await page.goto('/');
    const curriculumCta = page.locator('main a:has-text("Preview Curriculum")');
    await expect(curriculumCta).toBeVisible();
    await curriculumCta.click();
    await expect(page).toHaveURL(/\/learn$/);
  });

  test('privacy and terms routes display template legal notice', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.locator('text=Project Template — Requires Legal Review')).toBeVisible();

    await page.goto('/terms');
    await expect(page.locator('text=Project Template — Requires Legal Review')).toBeVisible();
  });

  test('404 not-found route renders properly without autofocusing recovery link', async ({
    page,
  }) => {
    const response = await page.goto('/non-existent-probe-route-404');
    expect(response?.status()).toBe(404);

    const h1 = page.locator('h1');
    await expect(h1).toContainText('Page Not Found');

    // Rule 21: The 404 page must not automatically move focus to a recovery link
    const activeTagName = await page.evaluate(() => document.activeElement?.tagName);
    expect(activeTagName).not.toBe('A');
  });
});

test.describe('Dashboard Shell & Preview Route Navigation', () => {
  test.beforeEach(async ({ context }) => {
    await authenticateAsLearner(context);
  });
  for (const route of DASHBOARD_ROUTES) {
    test(`dashboard route ${route} loads without 404 and has unique h1 and main`, async ({
      page,
    }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      const response = await page.goto(route);
      expect(response?.status()).toBe(200);

      // Verify unique h1
      await expect(page.locator('h1')).toHaveCount(1);

      // Verify unique main landmark
      await expect(page.locator('main')).toHaveCount(1);

      // Verify no console errors
      const cspErrors = consoleErrors.filter(
        (err) =>
          (err.toLowerCase().includes('content security policy') ||
            err.toLowerCase().includes('csp') ||
            err.toLowerCase().includes('violates')) &&
          !err.includes('blocked a JavaScript eval'),
      );
      expect(cspErrors).toEqual([]);
    });
  }

  test('dashboard response headers enforce dynamic nonce CSP and no-store', async ({
    request,
    context,
  }) => {
    const { sessionCookie } = await authenticateAsLearner(context);
    const res = await request.get('/dashboard', {
      headers: { Cookie: sessionCookie },
    });
    expect(res.status()).toBe(200);

    const csp = res.headers()['content-security-policy'] ?? '';
    expect(csp).toContain("'nonce-");
    expect(csp).not.toContain("'unsafe-eval'");

    const cacheControl = res.headers()['cache-control'] ?? '';
    expect(cacheControl).toContain('no-store');
  });

  test('dashboard renders deterministic learner welcome copy', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText('make Java click today');
  });

  test('dashboard sidebar contains all 8 expected navigation items and no sign-out', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    const nav = page.locator('nav[aria-label="Dashboard navigation"]');
    await expect(nav).toBeVisible();

    const links = nav.locator('a');
    expect(await links.count()).toBeGreaterThanOrEqual(8);

    // Rule 9: Remove Sign Out control because Phase 2 has no authentication or session
    await expect(page.locator('button:has-text("Sign Out")')).toHaveCount(0);
    await expect(page.locator('a:has-text("Sign Out")')).toHaveCount(0);
  });
});
