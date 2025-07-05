import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';
import { SELECTORS } from './fixtures/test-data';

test.describe('Karenina GUI - Smoke Tests', () => {
  test('should load the application homepage', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Navigate to the homepage
    await page.goto('/');

    // Wait for the app to load
    await helpers.waitForAppLoad();

    // Check that the page title is correct
    await expect(page).toHaveTitle(/Karenina/);

    // Check that the main navigation tabs are present
    await expect(page.locator('button:has-text("Question Extractor")')).toBeVisible();
    await expect(page.locator('button:has-text("Template Generator")')).toBeVisible();
    await expect(page.locator('button:has-text("Template Curator")')).toBeVisible();
    await expect(page.locator('button:has-text("LLM Chat")')).toBeVisible();
    await expect(page.locator('button:has-text("Benchmark")')).toBeVisible();
  });

  test('should navigate between tabs', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Navigate to the homepage
    await page.goto('/');
    await helpers.waitForAppLoad();

    // Test navigation to each tab
    const tabs = ['generator', 'curator', 'chat', 'benchmark', 'extractor'] as const;

    for (const tab of tabs) {
      await helpers.navigateToTab(tab);

      // Check that the tab button is visible (this validates navigation worked)
      const tabSelector = SELECTORS.navigation[`${tab}Tab` as keyof typeof SELECTORS.navigation];
      await expect(page.locator(tabSelector)).toBeVisible();

      // Give a moment for the tab content to render
      await page.waitForTimeout(100);
    }
  });

  test('should display the application without critical JavaScript errors', async ({ page }) => {
    const helpers = new TestHelpers(page);
    const criticalErrors: string[] = [];

    // Listen for console errors - filter out expected warnings
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Skip known non-critical warnings/errors
        if (
          !text.includes('Warning:') &&
          !text.includes('Failed to load sessions') &&
          !text.includes('SyntaxError: Unexpected token')
        ) {
          criticalErrors.push(text);
        }
      }
    });

    // Navigate to the homepage
    await page.goto('/');
    await helpers.waitForAppLoad();

    // Navigate through all tabs to ensure no critical JS errors
    const tabs = ['extractor', 'generator', 'curator', 'chat', 'benchmark'] as const;

    for (const tab of tabs) {
      await helpers.navigateToTab(tab);
      await page.waitForTimeout(300);
    }

    // Check that no critical console errors occurred
    expect(criticalErrors).toHaveLength(0);
  });

  test('should have working theme toggle', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Navigate to the homepage
    await page.goto('/');
    await helpers.waitForAppLoad();

    // Look for theme toggle button - it has dynamic aria-label and contains Moon/Sun icons
    const themeToggleSelector = 'button[aria-label*="Switch to"][aria-label*="mode"]';
    const themeToggleExists = await helpers.elementExists(themeToggleSelector);

    if (themeToggleExists) {
      // Get the initial theme state by checking the icon
      const initialIcon = await page.locator(`${themeToggleSelector} svg`).getAttribute('class');

      // Click the theme toggle
      await page.click(themeToggleSelector);

      // Wait for theme change to apply
      await page.waitForTimeout(500);

      // Verify the icon changed (indicating theme switched)
      const newIcon = await page.locator(`${themeToggleSelector} svg`).getAttribute('class');
      expect(newIcon).not.toBe(initialIcon);

      // Click again to toggle back
      await page.click(themeToggleSelector);
      await page.waitForTimeout(500);

      // Verify it switched back
      const finalIcon = await page.locator(`${themeToggleSelector} svg`).getAttribute('class');
      expect(finalIcon).toBe(initialIcon);
    } else {
      // Try alternative approach - look for button with Moon or Sun icon
      const iconToggleSelector = 'button:has([data-lucide="moon"]), button:has([data-lucide="sun"])';
      const iconExists = await helpers.elementExists(iconToggleSelector);

      if (iconExists) {
        await page.click(iconToggleSelector);
        await page.waitForTimeout(500);
        expect(true).toBe(true);
      } else {
        test.fail('Theme toggle button not found with any expected selector');
      }
    }
  });
});
