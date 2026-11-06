import { test, expect } from '@playwright/test';
import { authenticateAsOwner } from './helpers/auth';

test.describe('Phase 10: Owner Administration, Quality & Evaluation Console', () => {
  test.beforeEach(async ({ context }) => {
    await authenticateAsOwner(context);
  });

  test('root /admin redirects to /dashboard/admin', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/.*\/dashboard\/admin/);
  });

  test('owner can view dashboard with system health indicators and capacity metrics', async ({
    page,
  }) => {
    await page.goto('/dashboard/admin');

    await expect(page.locator('h1')).toContainText('Owner Administration');
    await expect(page.locator('text=Role: OWNER')).toBeVisible();

    // System Health indicators
    await expect(page.locator('text=PostgreSQL 17')).toBeVisible();
    await expect(page.locator('text=Redis Queue')).toBeVisible();
    await expect(page.locator('text=Redis Cache')).toBeVisible();
    await expect(page.locator('text=Sandbox (Java 21)')).toBeVisible();

    // Capacity card
    await expect(page.locator('text=Closed-Beta Capacity')).toBeVisible();
  });

  test('owner can navigate between administration tabs', async ({ page }) => {
    await page.goto('/dashboard/admin');

    // 1. Flagged Answers tab
    const feedbackTab = page.locator('button:has-text("Flagged Answers")');
    await expect(feedbackTab).toBeVisible();
    await feedbackTab.click();
    await expect(page.locator('h2#feedback-heading')).toContainText(
      'Flagged Answers & Feedback Triage',
    );

    // 2. Knowledge Approval tab
    const kbTab = page.locator('button:has-text("Knowledge Approval")');
    await expect(kbTab).toBeVisible();
    await kbTab.click();
    await expect(page.locator('h2#kb-heading')).toContainText('Knowledge Base Candidate Approval');

    // 3. Golden Evaluations tab
    const evalsTab = page.locator('button:has-text("Golden Evaluations")');
    await expect(evalsTab).toBeVisible();
    await evalsTab.click();
    await expect(page.locator('h2#evals-heading')).toContainText('Golden Evaluation Suite Monitor');
    await expect(page.locator('button:has-text("Execute Evaluation Run")')).toBeVisible();

    // 4. Return to Overview tab
    const overviewTab = page.locator('button:has-text("Overview & Health")');
    await expect(overviewTab).toBeVisible();
    await overviewTab.click();
    await expect(page.locator('text=Closed-Beta Capacity')).toBeVisible();
  });
});
