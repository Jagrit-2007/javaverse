import { test, expect } from '@playwright/test';
import { authenticateAsLearner } from './helpers/auth';

test.describe('Phase 8: Curriculum & Lessons User Journeys', () => {
  test.beforeEach(async ({ context }) => {
    await authenticateAsLearner(context);
  });
  test('curriculum catalog displays 12 lessons and allows track filtering', async ({ page }) => {
    await page.goto('/dashboard/learn');

    // Verify main landmark and unique heading
    await expect(page.locator('h1')).toContainText('Curriculum & Learning Paths');

    // Verify 12 lesson cards are present
    const lessonCards = page.locator('article');
    await expect(lessonCards).toHaveCount(12);

    // Verify track filter buttons
    const foundationsFilter = page.locator('button[role="tab"]:has-text("Foundations")');
    await expect(foundationsFilter).toBeVisible();
    await foundationsFilter.click();

    // Verify filtered count
    await expect(page.locator('article')).toHaveCount(3);
  });

  test('navigates to lesson detail, switches depth tabs, and verifies visualizer', async ({
    page,
  }) => {
    await page.goto('/dashboard/learn/primitive-types');

    // Verify unique h1
    const h1 = page.locator('h1');
    await expect(h1).toContainText('Java Primitive Types & Memory Layout');

    // Verify hook analogy callout
    await expect(page.locator('text=Imagine physical lockers')).toBeVisible();

    // Verify Three-Depth tab switcher
    const standardTab = page.locator('button[role="tab"]:has-text("Standard Depth")');
    await expect(standardTab).toBeVisible();
    await standardTab.click();
    await expect(page.locator('text=Widening vs Narrowing Conversions')).toBeVisible();

    const deepTab = page.locator('button[role="tab"]:has-text("Deep Dive")');
    await expect(deepTab).toBeVisible();
    await deepTab.click();
    await expect(page.locator('text=JVM Stack Frame Internals')).toBeVisible();

    // Verify Interactive Concept Visualizer is rendered
    await expect(page.locator('text=Interactive Concept Visualization')).toBeVisible();
    await expect(page.locator('button[aria-label="Step forward"]')).toBeVisible();

    // Verify 5-question quiz presence
    await expect(page.locator('text=Check Your Understanding')).toBeVisible();
    const quizQuestions = page.locator('fieldset');
    await expect(quizQuestions).toHaveCount(5);

    // Verify Ask AI CTA routes with prompt query and lesson slug
    const askAiBtn = page.locator('#ask-ai-lesson-btn');
    await expect(askAiBtn).toBeVisible();
    await askAiBtn.click();

    await page.waitForURL('**/dashboard/ask*');
    expect(page.url()).toContain('/dashboard/ask?prompt=');
    expect(page.url()).toContain('lesson=primitive-types');
  });
});
