import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Question Extraction E2E Workflow', () => {
    test('should upload file and extract questions successfully', async ({ page }) => {
      const helpers = new TestHelpers(page);
      
      // Listen to console messages for debugging
      page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
      page.on('pageerror', err => console.log(`PAGE ERROR: ${err.message}`));
      
      // Navigate to the homepage and wait for app to load
      await page.goto('/');
      await helpers.waitForAppLoad();
      
      // Navigate to the Question Extractor tab (first tab)
      await helpers.navigateToTab('extractor');
      
      // Verify we're on the upload step
      await expect(page.locator('h3:has-text("Upload Question File")')).toBeVisible();
      await expect(page.locator('text=Choose a file to upload')).toBeVisible();
      
      // Get the file path for the test Excel file
      const testFilePath = path.join(__dirname, 'data/data_test_e2e.xlsx');
      console.log(`Test file path: ${testFilePath}`);
      
      // Upload the file using the hidden file input
      const fileInput = page.locator('input[type="file"]#file-upload');
      await fileInput.setInputFiles(testFilePath);

      // Wait a bit for the UI to update
      await page.waitForTimeout(1000);

      const extractButton = page.locator('button:has-text("Extract Questions")');
      await expect(extractButton).toBeEnabled();
      await extractButton.click();

      await expect(page.getByText('Successfully extracted 84')).toBeVisible();
    });
});