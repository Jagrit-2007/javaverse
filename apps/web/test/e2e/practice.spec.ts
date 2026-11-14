import { test, expect } from '@playwright/test';
import { authenticateAsLearner } from './helpers/auth';

test.describe('Phase 9: Practice, Progress, Library & Settings User Journeys', () => {
  test.beforeEach(async ({ context }) => {
    await authenticateAsLearner(context);
  });
  test('practice catalog displays problems and allows topic filtering', async ({ page }) => {
    await page.goto('/dashboard/practice');

    await expect(page.locator('h1')).toContainText('Practice & Coding Challenges');

    // 12 problems seeded
    const cards = page.locator('article');
    await expect(cards).toHaveCount(12);

    // Filter by OOP topic
    const oopFilter = page.locator('button:has-text("OOP")');
    await expect(oopFilter).toBeVisible();
    await oopFilter.click();

    // 3 OOP problems
    await expect(page.locator('article')).toHaveCount(3);
  });

  test('problem workspace displays prompt, hints accordion, and code editor', async ({ page }) => {
    await page.goto('/dashboard/practice/two-sum-array');

    await expect(page.locator('h1')).toContainText('Two Sum Array');

    // Prompt content
    await expect(page.locator('text=Given an array of integers')).toBeVisible();

    // Hint 1 accordion
    const hint1Btn = page.locator('button:has-text("Hint 1")');
    await expect(hint1Btn).toBeVisible();
    await hint1Btn.click();
    await expect(page.locator('text=A brute force approach')).toBeVisible();

    // Code editor textarea
    const editor = page.locator('textarea#java-editor');
    await expect(editor).toBeVisible();

    // Ask AI mentor button
    const askAiLink = page.locator('a:has-text("Ask AI Mentor")');
    await expect(askAiLink).toBeVisible();
  });

  test('progress dashboard displays topic mastery map and gamification stats', async ({ page }) => {
    await page.goto('/dashboard/progress');

    await expect(page.locator('h1')).toContainText('Your Learning Journey & Progress');

    // Topic mastery heading
    await expect(page.locator('#topic-mastery-heading')).toBeVisible();
    await expect(page.getByText('Core Java', { exact: false }).first()).toBeVisible();
    await expect(
      page.getByText('Object-Oriented Programming', { exact: false }).first(),
    ).toBeVisible();
    await expect(
      page.getByText('Data Structures & Algorithms', { exact: false }).first(),
    ).toBeVisible();
    await expect(page.getByText('Advanced Java', { exact: false }).first()).toBeVisible();

    // Badges heading
    await expect(page.locator('#badges-shelf-heading')).toBeVisible();
    await expect(page.locator('text=First Steps')).toBeVisible();
    await expect(page.locator('text=Hello World')).toBeVisible();
  });

  test('library and settings pages render successfully', async ({ page }) => {
    await page.goto('/dashboard/library');
    await expect(page.locator('h1')).toContainText('Your Library & Bookmarks');

    await page.goto('/dashboard/settings');
    await expect(page.locator('h1')).toContainText('Account Settings & Learning Preferences');
    await expect(page.locator('#display-name')).toBeVisible();
    await expect(page.locator('#java-version')).toBeVisible();
  });
});
