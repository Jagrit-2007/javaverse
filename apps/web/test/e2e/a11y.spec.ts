import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ALL_ROUTES = [
  '/',
  '/learn',
  '/about',
  '/privacy',
  '/terms',
  '/contact',
  '/dashboard',
  '/dashboard/learn',
  '/dashboard/practice',
  '/dashboard/ask',
  '/dashboard/library',
  '/dashboard/progress',
  '/dashboard/notes',
  '/dashboard/settings',
];

test.describe('Automated Accessibility Scans (@axe-core/playwright)', () => {
  for (const route of ALL_ROUTES) {
    test(`route ${route} has zero axe-core WCAG 2.2 AA violations`, async ({ page }) => {
      await page.goto(route);
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }

  test('404 route has zero axe-core violations', async ({ page }) => {
    await page.goto('/non-existent-probe-route-404');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('Dialog Accessibility & Keyboard Interactions', () => {
  test('dashboard daily challenge hints modal behaves correctly', async ({ page }) => {
    await page.goto('/dashboard');

    const hintsBtn = page.locator('button:has-text("View Hints")');
    await expect(hintsBtn).toBeVisible();

    // Open dialog
    await hintsBtn.click();
    const dialog = page.locator('dialog[aria-labelledby="dialog-title"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('open', '');

    // Press Escape to dismiss
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();

    // Verify focus returned to trigger
    const activeIsTrigger = await page.evaluate(() => {
      return document.activeElement?.textContent?.includes('View Hints');
    });
    expect(activeIsTrigger).toBe(true);

    // Open again and close via explicit close button
    await hintsBtn.click();
    await expect(dialog).toBeVisible();
    const closeBtn = page.locator('button[aria-label="Close dialog"]');
    await closeBtn.click();
    await expect(dialog).not.toBeVisible();
  });

  test('mobile navigation drawer behaves correctly on small viewports', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard');

    const menuBtn = page.locator('button[aria-label="Open navigation menu"]');
    await expect(menuBtn).toBeVisible();

    // Open drawer dialog
    await menuBtn.click();
    const drawerDialog = page.locator('dialog[aria-label="Navigation menu"]');
    await expect(drawerDialog).toBeVisible();
    await expect(drawerDialog).toHaveAttribute('open', '');

    // Escape dismisses drawer
    await page.keyboard.press('Escape');
    await expect(drawerDialog).not.toBeVisible();

    // Open again and click a navigation destination
    await menuBtn.click();
    await expect(drawerDialog).toBeVisible();

    const practiceLink = drawerDialog.locator('a:has-text("Practice")');
    await practiceLink.click();

    // Verify URL changed and drawer closed
    await expect(page).toHaveURL(/\/dashboard\/practice/);
    await expect(drawerDialog).not.toBeVisible();
  });
});

test.describe('Reflow, Visible Focus, Reduced Motion & Theme Behavior', () => {
  test('natural 320 CSS pixel reflow on / and /dashboard without horizontal scroll', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });

    // Test landing page
    await page.goto('/');
    const landingScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(landingScrollWidth).toBeLessThanOrEqual(320);

    // Test dashboard shell
    await page.goto('/dashboard');
    const dashboardScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(dashboardScrollWidth).toBeLessThanOrEqual(320);
  });

  test('skip link reveals on Tab navigation and targets main content', async ({ page }) => {
    await page.goto('/dashboard');
    await page.keyboard.press('Tab');

    const skipLink = page.locator('a:has-text("Skip to main content")');
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();

    await page.keyboard.press('Enter');
    const activeId = await page.evaluate(() => document.activeElement?.id);
    expect(activeId).toBe('main-content');
  });

  test('theme selection switches attributes correctly without flash', async ({ page }) => {
    await page.goto('/dashboard');

    // Default theme is light
    const htmlThemeInitial = await page.getAttribute('html', 'data-theme');
    expect(htmlThemeInitial).toBe('light');

    // Select Dark
    const themeSelect = page.locator('header select[aria-label="Select color theme"]');
    await themeSelect.selectOption('dark');

    const htmlThemeDark = await page.getAttribute('html', 'data-theme');
    expect(htmlThemeDark).toBe('dark');

    const storedThemeDark = await page.evaluate(() => localStorage.getItem('javaverse-theme'));
    expect(storedThemeDark).toBe('dark');

    // Select System
    await themeSelect.selectOption('system');
    const storedThemeSystem = await page.evaluate(() => localStorage.getItem('javaverse-theme'));
    expect(storedThemeSystem).toBe('system');

    // Select Light
    await themeSelect.selectOption('light');
    const htmlThemeLight = await page.getAttribute('html', 'data-theme');
    expect(htmlThemeLight).toBe('light');
  });
});
