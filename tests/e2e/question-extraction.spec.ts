import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';
import { TEST_CONFIG } from './test-config';
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
    
    // Wait for upload to complete - the button should show "Uploading..." then disappear
    await expect(page.locator('button:has-text("Uploading...")')).toBeVisible();
    await expect(page.locator('button:has-text("Uploading...")')).not.toBeVisible({ 
      timeout: TEST_CONFIG.timeouts.longOperation 
    });
    
    // Wait a bit for the UI to update
    await page.waitForTimeout(1000);
    
    // Check what's actually on the page after upload
    const pageContent = await page.content();
    console.log('Page after upload:', pageContent.substring(0, 1000));
    
    // Look for any error messages
    const errorMessages = await page.locator('text=error').all();
    if (errorMessages.length > 0) {
      console.log('Found error messages:');
      for (const error of errorMessages) {
        console.log(await error.textContent());
      }
    }
    
    // Should automatically move to preview/configure step
    await expect(page.locator('h3:has-text("Configure Columns")')).toBeVisible({ 
      timeout: TEST_CONFIG.timeouts.mediumOperation 
    });
    
    // Verify file info is displayed (filename should be visible)
    await expect(page.locator('text=data_test_e2e.xlsx')).toBeVisible();
    
    // Wait for column selection to be available
    const questionSelect = page.locator('select').first(); // Question column dropdown
    const answerSelect = page.locator('select').nth(1); // Answer column dropdown
    
    // Wait for options to be populated - real data has 9 columns + "Select column..." options = 11 total
    await expect(questionSelect.locator('option')).toHaveCount(11, { timeout: TEST_CONFIG.timeouts.shortOperation });
    
    // Verify that Question and Answer columns are available and auto-selected
    await expect(questionSelect).toHaveValue('Question');
    await expect(answerSelect).toHaveValue('Answer');
    
    // Verify "Ready to extract" indicator appears
    await expect(page.locator('text=Ready to extract')).toBeVisible();
    
    // Click the "Extract Questions" button
    const extractButton = page.locator('button:has-text("Extract Questions")');
    await expect(extractButton).toBeEnabled();
    await extractButton.click();
    
    // Wait for extraction to complete
    await expect(page.locator('button:has-text("Extracting...")')).toBeVisible();
    await expect(page.locator('button:has-text("Extracting...")')).not.toBeVisible({ 
      timeout: TEST_CONFIG.timeouts.longOperation 
    });
    
    // Should move to the visualize step
    await expect(page.locator('h3:has-text("Extraction Complete")')).toBeVisible({ 
      timeout: TEST_CONFIG.timeouts.mediumOperation 
    });
    
    // Verify the extraction results - we expect some questions to be extracted
    // Use a more flexible matcher since we don't know the exact count from real data
    await expect(page.locator('text=Successfully extracted')).toBeVisible();
    await expect(page.locator('text=questions')).toBeVisible();
    
    // Check for download buttons
    await expect(page.locator('button:has-text("JSON")')).toBeVisible();
    await expect(page.locator('button:has-text("Python")')).toBeVisible();
    
    // Verify some sample questions are visible in the results
    // The QuestionVisualizer should display the extracted questions
    await expect(page.locator('.bg-white\\/80, .bg-slate-800\\/80').first()).toBeVisible();
    
    // Test the JSON download functionality
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button:has-text("JSON")').click();
    const download = await downloadPromise;
    
    // Verify the download filename pattern
    expect(download.suggestedFilename()).toMatch(/extracted_questions_\d{4}-\d{2}-\d{2}\.json/);
    
    // Test the "Start Over" functionality
    await page.locator('button:has-text("Start Over")').click();
    
    // Should return to the upload step
    await expect(page.locator('h3:has-text("Upload Question File")')).toBeVisible();
    await expect(page.locator('text=Choose a file to upload')).toBeVisible();
  });

  test('should handle file upload with drag and drop', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    // Navigate to the homepage and extractor tab
    await page.goto('/');
    await helpers.waitForAppLoad();
    await helpers.navigateToTab('extractor');
    
    // Get the drop zone element
    const dropZone = page.locator('.border-dashed').first();
    await expect(dropZone).toBeVisible();
    
    // Create a test file for drag and drop simulation
    const testFilePath = path.join(__dirname, 'data/data_test_e2e.xlsx');
    
    // Simulate drag over to test the UI feedback
    await dropZone.hover();
    
    // For drag and drop, we'll use the file input approach since
    // real drag and drop is complex to simulate in E2E tests
    const fileInput = page.locator('input[type="file"]#file-upload');
    await fileInput.setInputFiles(testFilePath);
    
    // Verify upload starts
    await expect(page.locator('button:has-text("Uploading...")')).toBeVisible();
    
    // Wait for upload completion
    await expect(page.locator('button:has-text("Uploading...")')).not.toBeVisible({ 
      timeout: TEST_CONFIG.timeouts.longOperation 
    });
  });

  test('should show file input with correct accept attribute', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    // Navigate to the homepage and extractor tab
    await page.goto('/');
    await helpers.waitForAppLoad();
    await helpers.navigateToTab('extractor');
    
    // Verify the file input has the correct accept attribute for valid file types
    const fileInput = page.locator('input[type="file"]#file-upload');
    await expect(fileInput).toHaveAttribute('accept', '.xlsx,.xls,.csv,.tsv,.txt');
    
    // Verify the drag and drop zone shows the correct supported formats
    await expect(page.locator('text=Supports Excel (.xlsx, .xls), CSV (.csv), and TSV (.tsv, .txt) files')).toBeVisible();
  });

  test('should handle extraction workflow step by step', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    // Navigate to the homepage and extractor tab
    await page.goto('/');
    await helpers.waitForAppLoad();
    await helpers.navigateToTab('extractor');
    
    // Verify initial step is "upload"
    const uploadStep = page.locator('.bg-indigo-100, .bg-indigo-900\\/30').filter({ hasText: 'Upload File' });
    await expect(uploadStep).toBeVisible();
    
    // Upload file
    const testFilePath = path.join(__dirname, 'data/data_test_e2e.xlsx');
    const fileInput = page.locator('input[type="file"]#file-upload');
    await fileInput.setInputFiles(testFilePath);
    
    // Wait for preview step to be active
    await expect(page.locator('.bg-indigo-100, .bg-indigo-900\\/30').filter({ hasText: 'Preview Data' })).toBeVisible({ 
      timeout: TEST_CONFIG.timeouts.mediumOperation 
    });
    
    // Wait for configure step to be active
    await expect(page.locator('.bg-indigo-100, .bg-indigo-900\\/30').filter({ hasText: 'Configure Columns' })).toBeVisible({ 
      timeout: TEST_CONFIG.timeouts.mediumOperation 
    });
    
    // Verify columns are available for selection
    const questionSelect = page.locator('select').first();
    await expect(questionSelect.locator('option[value="Question"]')).toBeAttached();
    await expect(questionSelect.locator('option[value="Answer"]')).toBeAttached();
    
    // Extract questions
    await page.locator('button:has-text("Extract Questions")').click();
    
    // Wait for extract step to be active
    await expect(page.locator('.bg-indigo-100, .bg-indigo-900\\/30').filter({ hasText: 'Extract Questions' })).toBeVisible();
    
    // Wait for visualize step to be active
    await expect(page.locator('.bg-indigo-100, .bg-indigo-900\\/30').filter({ hasText: 'Visualize Results' })).toBeVisible({ 
      timeout: TEST_CONFIG.timeouts.longOperation 
    });
    
    // Verify completed steps show the right styling
    await expect(page.locator('.bg-emerald-100, .bg-emerald-900\\/30').filter({ hasText: 'Upload File' })).toBeVisible();
    await expect(page.locator('.bg-emerald-100, .bg-emerald-900\\/30').filter({ hasText: 'Preview Data' })).toBeVisible();
  });
});