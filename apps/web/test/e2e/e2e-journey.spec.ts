import { test, expect } from '@playwright/test';
import { authenticateAsLearner } from './helpers/auth';

test.describe('Phase 11: End-to-End Complete Learner Journey', () => {
  test('full end-to-end user journey across marketing, learning, practice, and progress', async ({
    page,
    context,
  }) => {
    // 1. Landing Page
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=JavaVerse').first()).toBeVisible();

    // Authenticate learner to enter dashboard learning journey
    await authenticateAsLearner(context);

    // 2. Explore Curriculum
    await page.goto('/dashboard/learn');
    await expect(page.locator('h1')).toContainText('Curriculum & Learning Paths');
    await expect(page.locator('article')).toHaveCount(12);

    // Filter by Foundations track
    const foundationsBtn = page.locator('button[role="tab"]:has-text("Foundations")');
    await foundationsBtn.click();
    await expect(page.locator('article')).toHaveCount(3);

    // 3. Dive into Lesson 1
    await page.goto('/dashboard/learn/primitive-types');
    await expect(page.locator('h1')).toContainText('Java Primitive Types');
    await expect(page.locator('text=Interactive Concept Visualization')).toBeVisible();

    // Switch depth to Deep Dive
    const deepTab = page.locator('button[role="tab"]:has-text("Deep Dive")');
    await deepTab.click();
    await expect(page.locator('text=JVM Stack Frame Internals')).toBeVisible();

    // Interact with Concept Visualizer
    const nextStepBtn = page.locator('button[aria-label="Step forward"]');
    if (await nextStepBtn.isVisible()) {
      await nextStepBtn.click();
    }

    // 4. Practice Workspace
    await page.goto('/dashboard/practice');
    await expect(page.locator('h1')).toContainText('Practice & Coding Challenges');
    await expect(page.locator('article')).toHaveCount(12);

    // Open Two Sum Array problem
    await page.goto('/dashboard/practice/two-sum-array');
    await expect(page.locator('h1')).toContainText('Two Sum');
    await expect(page.locator('text=Hints')).toBeVisible();

    // Verify Run and Submit buttons
    await expect(page.locator('button:has-text("Run Sample Tests")')).toBeVisible();
    await expect(page.locator('button:has-text("Submit Solution")')).toBeVisible();

    // 5. Progress & Mastery Dashboard
    await page.goto('/dashboard/progress');
    await expect(page.locator('h1')).toContainText('Your Learning Journey & Progress');
    await expect(page.locator('#topic-mastery-heading')).toBeVisible();
    await expect(page.getByText('Core Java', { exact: false }).first()).toBeVisible();
    await expect(
      page.getByText('Object-Oriented Programming', { exact: false }).first(),
    ).toBeVisible();
    await expect(page.locator('#badges-shelf-heading')).toBeVisible();

    // 6. Library Bookmarks & Notes
    await page.goto('/dashboard/library');
    await expect(page.locator('h1')).toContainText('Your Library & Bookmarks');

    // 7. Settings & Privacy Controls
    await page.goto('/dashboard/settings');
    await expect(page.locator('h1')).toContainText('Account Settings & Learning Preferences');
    await expect(page.locator('#display-name')).toBeVisible();
    await expect(page.locator('#java-version')).toBeVisible();
  });
});
