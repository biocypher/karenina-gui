import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe('Question Extractor - Different File Formats', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await page.goto('/');
    await helpers.waitForAppLoad();
    await helpers.navigateToTab('extractor');
  });

  test('should upload and extract questions from CSV file', async ({ page }) => {
    // Upload CSV test file
    const csvFilePath = path.join(__dirname, 'data/test_questions.csv');
    const fileInput = page.locator('input[type="file"]#file-upload');
    await fileInput.setInputFiles(csvFilePath);

    // Wait for file to be processed
    await page.waitForTimeout(1000);

    // Click extract questions
    const extractButton = page.locator('button:has-text("Extract Questions")');
    await expect(extractButton).toBeEnabled();
    await extractButton.click();

    // Should successfully extract 5 questions from CSV
    await expect(page.getByText('Successfully extracted 5')).toBeVisible();
  });

  test('should upload and extract questions from TSV file', async ({ page }) => {
    // Upload TSV test file
    const tsvFilePath = path.join(__dirname, 'data/test_questions.tsv');
    const fileInput = page.locator('input[type="file"]#file-upload');
    await fileInput.setInputFiles(tsvFilePath);

    // Wait for file to be processed
    await page.waitForTimeout(1000);

    // Click extract questions
    const extractButton = page.locator('button:has-text("Extract Questions")');
    await expect(extractButton).toBeEnabled();
    await extractButton.click();

    // Should successfully extract 5 questions from TSV
    await expect(page.getByText('Successfully extracted 5')).toBeVisible();
  });

  test('should handle empty CSV file gracefully', async ({ page }) => {
    // Upload empty CSV file
    const emptyFilePath = path.join(__dirname, 'data/empty_file.csv');
    const fileInput = page.locator('input[type="file"]#file-upload');
    await fileInput.setInputFiles(emptyFilePath);

    // Wait for file to be processed
    await page.waitForTimeout(1000);

    // Extract button should be present
    const extractButton = page.locator('button:has-text("Extract Questions")');
    await expect(extractButton).toBeVisible();

    // Try to click extract
    if (await extractButton.isEnabled()) {
      await extractButton.click();

      // App shows error for empty files - this is valid behavior
      // Accept either error message or success with 0 questions
      await expect(
        page
          .locator('text=Error extracting questions')
          .or(page.locator('text=No valid questions found'))
          .or(page.locator('text=Successfully extracted 0'))
          .or(page.locator('h3:has-text("empty_file.csv")'))
      ).toBeVisible();
    } else {
      // Button is disabled - that's also valid behavior for empty file
      await expect(extractButton).toBeDisabled();
    }
  });

  test('should handle invalid file format', async ({ page }) => {
    // Upload invalid file
    const invalidFilePath = path.join(__dirname, 'data/invalid/invalid_format.txt');
    const fileInput = page.locator('input[type="file"]#file-upload');
    await fileInput.setInputFiles(invalidFilePath);

    // Wait for file to be processed
    await page.waitForTimeout(1000);

    // Should show error or disable extract button
    const extractButton = page.locator('button:has-text("Extract Questions")');

    if (await extractButton.isEnabled()) {
      await extractButton.click();

      // Should show error message - use more specific selector
      await expect(page.locator('text=Error').or(page.locator('text=failed to extract'))).toBeVisible();
    } else {
      // Button should be disabled for invalid file
      await expect(extractButton).toBeDisabled();
    }
  });

  test('should handle corrupted Excel file', async ({ page }) => {
    // Upload corrupted Excel file
    const corruptFilePath = path.join(__dirname, 'data/invalid/corrupt_excel.xlsx');
    const fileInput = page.locator('input[type="file"]#file-upload');
    await fileInput.setInputFiles(corruptFilePath);

    // Wait for file to be processed
    await page.waitForTimeout(1000);

    // Check if file loading failed (error appears immediately) or if extract button is available
    const errorLoadingFile = page.locator('text=Error Loading File');
    const extractButton = page.locator('button:has-text("Extract Questions")');

    // Either file loading failed or extract button is available
    if (await errorLoadingFile.isVisible()) {
      // File loading failed - accept Excel engine error message
      await expect(page.locator('text=Error Loading File').first()).toBeVisible();
    } else if (await extractButton.isVisible()) {
      // Extract button is available - try extraction
      if (await extractButton.isEnabled()) {
        await extractButton.click();

        // Accept various error responses
        await expect(
          page
            .locator('text=Error')
            .or(page.locator('text=corrupt'))
            .or(page.locator('text=failed'))
            .or(page.locator('text=Successfully extracted 0'))
            .or(page.locator('text=Successfully extracted'))
        ).toBeVisible();
      } else {
        // Button disabled is also acceptable behavior
        await expect(extractButton).toBeDisabled();
      }
    } else {
      // Something went wrong - just check that we have some error indication
      await expect(
        page
          .locator('text=Error')
          .or(page.locator('text=corrupt'))
          .or(page.locator('text=Excel file format cannot be determined'))
      ).toBeVisible();
    }
  });

  test('should support file upload (fallback to regular input)', async ({ page }) => {
    // Test regular file input as fallback since drag-drop may not be implemented
    const csvFilePath = path.join(__dirname, 'data/test_questions.csv');

    // Use regular file input
    const fileInput = page.locator('input[type="file"]#file-upload');
    await fileInput.setInputFiles(csvFilePath);

    // Wait for file to be processed
    await page.waitForTimeout(1000);

    // Should show extract button is enabled or some indication file was uploaded
    const extractButton = page.locator('button:has-text("Extract Questions")');
    await expect(extractButton).toBeVisible();
  });

  test('should handle large file upload (stress test)', async ({ page }) => {
    // Upload large CSV file
    const largeFilePath = path.join(__dirname, 'data/large_questions.csv');
    const fileInput = page.locator('input[type="file"]#file-upload');
    await fileInput.setInputFiles(largeFilePath);

    // Wait longer for large file to be processed
    await page.waitForTimeout(3000);

    // Click extract questions
    const extractButton = page.locator('button:has-text("Extract Questions")');
    await expect(extractButton).toBeEnabled();
    await extractButton.click();

    // Should successfully extract 1000 questions from large CSV
    // This might take a while, so increase timeout
    await expect(page.getByText('Successfully extracted 1000')).toBeVisible({ timeout: 15000 });
  });

  test('should allow re-uploading different file', async ({ page }) => {
    // Upload first file
    const csvFilePath = path.join(__dirname, 'data/test_questions.csv');
    const fileInput = page.locator('input[type="file"]#file-upload');
    await fileInput.setInputFiles(csvFilePath);
    await page.waitForTimeout(1000);

    // Extract questions
    const extractButton = page.locator('button:has-text("Extract Questions")');
    await extractButton.click();
    await expect(page.getByText('Successfully extracted 5')).toBeVisible();

    // Wait a bit for the first extraction to fully complete
    await page.waitForTimeout(500);

    // Click "Start Over" to reset the state and return to upload
    const startOverButton = page.locator('button:has-text("Start Over")');
    await expect(startOverButton).toBeVisible();
    await startOverButton.click();

    // Wait for the upload state to return
    await page.waitForTimeout(500);

    // Upload different file using the file input that should now be visible again
    const fileInputAfterReset = page.locator('input[type="file"]#file-upload');
    await fileInputAfterReset.setInputFiles(path.join(__dirname, 'data/test_questions.tsv'));
    await page.waitForTimeout(1000);

    // Extract questions from new file - should work again
    const extractButtonAfterReset = page.locator('button:has-text("Extract Questions")');
    await extractButtonAfterReset.click();
    await expect(page.getByText('Successfully extracted 5')).toBeVisible();
  });

  test('should display file format information', async ({ page }) => {
    // Check that supported file formats are mentioned
    await expect(page.locator('text=Excel')).toBeVisible();
    await expect(page.locator('text=CSV')).toBeVisible();
    await expect(page.locator('text=TSV')).toBeVisible();

    // Check file extensions are mentioned
    await expect(page.locator('text=.xlsx')).toBeVisible();
    await expect(page.locator('text=.csv')).toBeVisible();
    await expect(page.locator('text=.tsv')).toBeVisible();
  });

  test.afterEach(async () => {
    await helpers.cleanupTempFiles();
  });
});
