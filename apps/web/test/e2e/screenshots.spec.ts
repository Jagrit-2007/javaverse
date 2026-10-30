import { test } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOT_DIR = path.resolve(__dirname, '../../../../docs/reviews/screenshots/phase-2');

test.describe('Phase 2 Visual Review Screenshots', () => {
  test('1. desktop-light-dashboard.png (1440x900, light theme)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard');
    // Ensure light theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('javaverse-theme', 'light');
    });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'desktop-light-dashboard.png'),
      fullPage: false,
    });
  });

  test('2. desktop-dark-dashboard.png (1440x900, dark theme)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard');
    // Set dark theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('javaverse-theme', 'dark');
    });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'desktop-dark-dashboard.png'),
      fullPage: false,
    });
  });

  test('3. mobile-light-dashboard.png (375x812, light theme)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard');
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('javaverse-theme', 'light');
    });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'mobile-light-dashboard.png'),
      fullPage: false,
    });
  });

  test('4. mobile-dark-dashboard.png (375x812, dark theme)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard');
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('javaverse-theme', 'dark');
    });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'mobile-dark-dashboard.png'),
      fullPage: false,
    });
  });

  test('5. public-landing-desktop.png (1440x900)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'public-landing-desktop.png'),
      fullPage: false,
    });
  });

  test('6. dashboard-loading-skeleton.png (?_fixture=loading)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard?_fixture=loading');
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'dashboard-loading-skeleton.png'),
      fullPage: false,
    });
  });

  test('7. dashboard-empty-state.png (?_fixture=empty)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard?_fixture=empty');
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'dashboard-empty-state.png'),
      fullPage: false,
    });
  });

  test('8. dashboard-error-state.png (?_fixture=error)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard?_fixture=error');
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'dashboard-error-state.png'),
      fullPage: false,
    });
  });

  test('9. dashboard-keyboard-focus.png', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard');
    // Focus on primary continue learning action link
    const continueBtn = page.locator('a:has-text("Continue Learning")');
    await continueBtn.focus();
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'dashboard-keyboard-focus.png'),
      fullPage: false,
    });
  });

  test('10. dashboard-reduced-motion.png', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard');
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'dashboard-reduced-motion.png'),
      fullPage: false,
    });
  });
});
