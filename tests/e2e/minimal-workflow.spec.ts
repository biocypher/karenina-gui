import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Minimal Workflow E2E Workflow', () => {
  test('should run the minimal workflow', async ({ page }) => {
    const helpers = new TestHelpers(page);

    // Listen to console messages for debugging
    page.on('console', (msg) => console.log(`PAGE LOG: ${msg.text()}`));
    page.on('pageerror', (err) => console.log(`PAGE ERROR: ${err.message}`));

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
    await page.getByRole('button', { name: 'Extract Questions' }).click();
    await page.getByRole('button', { name: 'Template Generator' }).click();
    await page.getByRole('button', { name: 'Select None' }).click();
    await page.getByRole('row', { name: 'Why was rofecoxib withdrawn?' }).getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Generate Templates (1' }).click();
    await page.waitForTimeout(5000);
    await page.getByRole('button', { name: 'Add to Curation (1)' }).click();
    await page.getByRole('button', { name: 'Flag as Finished' }).click();
    await page.getByRole('button', { name: 'Benchmark' }).click();
    await page.getByRole('button', { name: 'Select All' }).click();
    await page.getByRole('button', { name: 'Run Selected (1 × 1 = 1)' }).click();
    await page.getByRole('row', { name: '1 Why was rofecoxib withdrawn' }).getByRole('button').click();
    await expect(page.locator('div').filter({ hasText: /^Success$/ })).toBeVisible();
  });
});
