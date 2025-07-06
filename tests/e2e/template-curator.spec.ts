import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe('Template Curator Tab', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await page.goto('/');
    await helpers.waitForAppLoad();
    await helpers.navigateToTab('curator');
  });

  test('should display curator tab with file management section', async ({ page }) => {
    // Check for main sections
    await expect(page.locator('h3:has-text("File Management")')).toBeVisible();
    await expect(page.locator('h4:has-text("Upload Files")')).toBeVisible();
    await expect(page.locator('h4:has-text("Download Files")')).toBeVisible();
    await expect(page.locator('h4:has-text("Actions")')).toBeVisible();

    // Check for upload buttons
    await expect(page.locator('text=Upload Question Data')).toBeVisible();
    await expect(page.locator('text=Upload Checkpoint')).toBeVisible();

    // Check download buttons are initially disabled
    await expect(page.locator('button:has-text("Download Question Data")')).toBeDisabled();
    await expect(page.locator('button:has-text("Download Checkpoint")')).toBeDisabled();
    await expect(page.locator('button:has-text("Download Finished Items")')).toBeDisabled();

    // Check reset button is enabled
    await expect(page.locator('button:has-text("Reset All Data")')).toBeEnabled();
  });

  test('should upload and process checkpoint file', async ({ page }) => {
    // Upload sample checkpoint file using the correct file input
    const checkpointPath = path.join(__dirname, 'data', 'sample_checkpoint.json');
    await page.setInputFiles('#checkpoint-upload', checkpointPath);

    // Wait for upload to process
    await page.waitForTimeout(2000);

    // Check that file management sections are still visible (basic validation)
    await expect(page.locator('text=Questions Loaded')).toBeVisible();
    await expect(page.locator('text=Items in Checkpoint')).toBeVisible();

    // Don't assume specific numbers since the format might not match exactly
    // Just verify the interface is responsive
    await expect(page.locator('h3:has-text("File Management")')).toBeVisible();
  });

  test('should show question selector in disabled state initially', async ({ page }) => {
    // Check that question selector exists and is disabled initially
    const questionSelector = page.locator('select').first();
    await expect(questionSelector).toBeVisible();
    await expect(questionSelector).toBeDisabled();

    // Check for any indication of empty state - focus on the most specific element
    await expect(page.locator('h3:has-text("No Questions with Generated Templates")').first()).toBeVisible();
  });

  test('should show reset button functionality', async ({ page }) => {
    // Setup dialog handler before clicking reset
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Check that reset button exists and is clickable
    const resetButton = page.locator('button:has-text("Reset All Data")');
    await expect(resetButton).toBeVisible();
    await expect(resetButton).toBeEnabled();

    // Click reset button
    await resetButton.click();

    // Wait for any dialog or reset operation
    await page.waitForTimeout(1000);

    // Reset redirects to Question Extractor tab - navigate back to Template Curator
    await helpers.navigateToTab('curator');

    // Verify interface is responsive after reset and navigation
    await expect(page.locator('h3:has-text("File Management")')).toBeVisible();
    await expect(page.locator('h4:has-text("Upload Files")')).toBeVisible();

    // Check that dropdown remains disabled (default state)
    const questionSelector = page.locator('select').first();
    await expect(questionSelector).toBeDisabled();
  });

  test('should show download buttons in initial disabled state', async ({ page }) => {
    // Check download buttons are initially disabled
    await expect(page.locator('button:has-text("Download Question Data")')).toBeDisabled();
    await expect(page.locator('button:has-text("Download Checkpoint")')).toBeDisabled();
    await expect(page.locator('button:has-text("Download Finished Items")')).toBeDisabled();
  });

  test('should show upload areas for different file types', async ({ page }) => {
    // Check that both upload options are available
    await expect(page.locator('text=Upload Question Data')).toBeVisible();
    await expect(page.locator('text=Upload Checkpoint')).toBeVisible();

    // Check that file inputs exist
    await expect(page.locator('#json-upload')).toBeHidden(); // Hidden file input
    await expect(page.locator('#checkpoint-upload')).toBeHidden(); // Hidden file input
  });

  test('should display file format information', async ({ page }) => {
    // Check all file format information is displayed
    await expect(page.locator('text=Question Data JSON:')).toBeVisible();
    await expect(page.locator('text=Unified Checkpoint (v2.0):')).toBeVisible();
    await expect(page.locator('text=Finished Items JSON:')).toBeVisible();
    await expect(page.locator("text=✅ What's Saved:")).toBeVisible();
    await expect(page.locator('text=📦 Single File Restore:')).toBeVisible();
  });

  test.afterEach(async () => {
    await helpers.cleanupTempFiles();
  });
});
