import { test, expect } from '@playwright/test';

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
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBe(1);

      // Verify unique main landmark
      const mainCount = await page.locator('main').count();
      expect(mainCount).toBe(1);

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
    expect(csp).toContain("'sha256-GV/BZf3I5eY8+JPJIO3tQvn8LgHuYvyWCaEAXQ1cFgg='");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  test('public landing and header View Demo Dashboard CTAs route to /dashboard', async ({
    page,
  }) => {
    await page.goto('/');

    // Hero CTA
    const heroCta = page.locator('main a:has-text("View Demo Dashboard")');
    await expect(heroCta).toBeVisible();
    await heroCta.click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // Return to landing and check header CTA
    await page.goto('/');
    const headerCta = page.locator('header a:has-text("View Demo Dashboard")');
    await expect(headerCta).toBeVisible();
    await headerCta.click();
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
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBe(1);

      // Verify unique main landmark
      const mainCount = await page.locator('main').count();
      expect(mainCount).toBe(1);

      // Verify no console errors
      const cspErrors = consoleErrors.filter(
        (err) =>
          err.toLowerCase().includes('content security policy') ||
          err.toLowerCase().includes('csp') ||
          err.toLowerCase().includes('violates'),
      );
      expect(cspErrors).toEqual([]);
    });
  }

  test('dashboard response headers enforce dynamic nonce CSP and no-store', async ({ request }) => {
    const res = await request.get('/dashboard');
    expect(res.status()).toBe(200);

    const csp = res.headers()['content-security-policy'] ?? '';
    expect(csp).toContain("'nonce-");
    expect(csp).not.toContain("'unsafe-eval'");

    const cacheControl = res.headers()['cache-control'] ?? '';
    expect(cacheControl).toContain('no-store');
  });

  test('dashboard renders deterministic learner welcome copy', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('text=Welcome back, learner')).toBeVisible();
    await expect(page.locator('h1')).toContainText('make Java click today');
  });

  test('dashboard sidebar contains all 8 expected navigation items and no sign-out', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    const nav = page.locator('nav[aria-label="Dashboard navigation"]');
    await expect(nav).toBeVisible();

    const links = nav.locator('a');
    expect(await links.count()).toBe(8);

    // Rule 9: Remove Sign Out control because Phase 2 has no authentication or session
    await expect(page.locator('button:has-text("Sign Out")')).toHaveCount(0);
    await expect(page.locator('a:has-text("Sign Out")')).toHaveCount(0);
  });
});
