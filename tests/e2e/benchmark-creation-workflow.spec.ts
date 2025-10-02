import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Complete Benchmark Creation Workflow', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);

    // Listen to console messages for debugging
    page.on('console', (msg) => console.log(`PAGE LOG: ${msg.text()}`));
    page.on('pageerror', (err) => console.log(`PAGE ERROR: ${err.message}`));

    await page.goto('/');
    await helpers.waitForAppLoad();
  });

  test('should create a new benchmark, add a manual question, and verify it', async ({ page }) => {
    // Step 1: Navigate to Template Curator tab
    await helpers.navigateToTab('curator');

    // Verify we're on the Template Curator tab
    await expect(page.locator('button:has-text("Template Curator")')).toHaveClass(/bg-gradient/);

    // Step 2: Create a new benchmark
    await page.locator('button:has-text("Create New Benchmark")').click();

    // Wait for modal to appear
    await expect(page.locator('h2:has-text("Create New Benchmark")')).toBeVisible();

    // Fill in the benchmark metadata
    await page.locator('input[placeholder*="Science Questions Benchmark"]').fill('E2E Test Benchmark');
    await page.locator('textarea[placeholder*="Describe the purpose"]').fill('Automated E2E test benchmark');
    await page.locator('input[placeholder*="1.0.0"]').fill('1.0.0');
    await page.locator('input[placeholder*="Your name"]').fill('E2E Test User');
    await page.locator('input[placeholder*="your.email@example.com"]').fill('e2e@test.com');

    // Submit the form
    await page.locator('button:has-text("Create Benchmark")').click();

    // Wait for modal to close and confirmation alert
    await page.waitForTimeout(1000);

    // Verify benchmark was created (should see empty question state)
    await expect(page.locator('text=No questions available')).toBeVisible();

    // Step 3: Add a manual question
    await page.locator('button:has-text("Add Question")').click();

    // Wait for Add Question modal
    await expect(page.locator('h2:has-text("Add New Question")')).toBeVisible();

    // Fill in question details
    await page.locator('textarea[placeholder*="Enter the question text"]').fill('What is 4+4?');
    await page.locator('textarea[placeholder*="Enter the answer text"]').fill('8');
    await page.locator('input[placeholder*="Question author name"]').fill('Test Author');
    await page.locator('input[placeholder*="math, geometry, basic"]').fill('math, arithmetic');

    // Submit the question
    await page.locator('button:has-text("Add Question")').click();

    // Wait for modal to close
    await page.waitForTimeout(1000);

    // Step 4: Verify question appears in Template Curator
    await expect(page.locator('text=What is 4+4?')).toBeVisible();
    await expect(page.locator('text=1 of 1 questions')).toBeVisible();

    // Verify the generated template uses BaseAnswer
    const templateEditor = page.locator('.cm-content');
    await expect(templateEditor).toBeVisible();

    // Check template content
    const templateText = await templateEditor.innerText();
    expect(templateText).toContain('from karenina.schemas.answer_class import BaseAnswer');
    expect(templateText).toContain('from pydantic import Field');
    expect(templateText).toContain('class Answer(BaseAnswer)');
    expect(templateText).toContain('answer: str = Field');

    // Step 5: Flag the question as finished
    await page.locator('button:has-text("Flag as Finished")').click();

    // Wait for status to update
    await page.waitForTimeout(500);

    // Verify finished status (button text should change)
    await expect(page.locator('button:has-text("Unflag as Finished")')).toBeVisible();

    // Step 6: Navigate to Benchmark tab
    await helpers.navigateToTab('benchmark');

    // Verify we have 1 finished template available
    await expect(page.locator('text=Test Selection (1 available)')).toBeVisible();

    // Select the test
    await page.locator('button:has-text("Select All")').click();

    // Verify selection
    await expect(page.locator('text=1 selected')).toBeVisible();

    // Step 7: Run the verification
    await page.locator('button:has-text("Run Selected")').click();

    // Wait for verification to complete (this may take several seconds)
    await page.waitForTimeout(10000);

    // Step 8: Verify results appeared
    await expect(page.locator('text=Test Results')).toBeVisible();

    // Look for the question in results table
    await expect(page.locator('text=What is 4+4?')).toBeVisible();

    // Click on the row to see detailed trace
    await page.locator('tr:has-text("What is 4+4?")').locator('button').first().click();

    // Wait for detailed trace modal
    await expect(page.locator('h2:has-text("Detailed Answering Trace")')).toBeVisible();

    // Verify trace contains expected information
    await expect(page.locator('text=Raw Question')).toBeVisible();
    await expect(page.locator('text=What is 4+4?')).toBeVisible();
    await expect(page.locator('text=Raw Answer (Expected)')).toBeVisible();
    await expect(page.locator('text=8').first()).toBeVisible();

    // Check for either Success or Failed status
    const statusLocator = page.locator('div:has-text("Success"), div:has-text("Failed")').first();
    await expect(statusLocator).toBeVisible();

    // Close the modal
    await page.locator('button[aria-label="Close modal"]').click();

    // Step 9: Download checkpoint to verify data integrity
    await helpers.navigateToTab('curator');

    // Click Download Checkpoint
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button:has-text("Download Checkpoint")').click();
    const download = await downloadPromise;

    // Verify download happened
    expect(download.suggestedFilename()).toMatch(/\.jsonld$/);

    console.log('✅ Complete benchmark creation workflow test passed!');
  });

  test('should handle validation errors in benchmark creation', async ({ page }) => {
    await helpers.navigateToTab('curator');

    // Open Create New Benchmark modal
    await page.locator('button:has-text("Create New Benchmark")').click();

    // Try to submit without filling required fields
    await page.locator('button:has-text("Create Benchmark")').click();

    // Should show validation error
    await expect(page.locator('text=Dataset name is required')).toBeVisible();

    // Modal should still be open
    await expect(page.locator('h2:has-text("Create New Benchmark")')).toBeVisible();

    // Fill in the name
    await page.locator('input[placeholder*="Science Questions Benchmark"]').fill('Test Benchmark');

    // Now submit should work
    await page.locator('button:has-text("Create Benchmark")').click();

    // Wait for modal to close
    await page.waitForTimeout(1000);

    // Modal should be closed
    await expect(page.locator('h2:has-text("Create New Benchmark")')).not.toBeVisible();
  });

  test('should handle validation errors in manual question creation', async ({ page }) => {
    // First create a benchmark
    await helpers.navigateToTab('curator');
    await page.locator('button:has-text("Create New Benchmark")').click();
    await page.locator('input[placeholder*="Science Questions Benchmark"]').fill('Test');
    await page.locator('button:has-text("Create Benchmark")').click();
    await page.waitForTimeout(1000);

    // Open Add Question modal
    await page.locator('button:has-text("Add Question")').click();

    // Try to submit without filling required fields
    await page.locator('button:has-text("Add Question")').click();

    // Should show validation errors
    await expect(page.locator('text=Question is required')).toBeVisible();
    await expect(page.locator('text=Answer is required')).toBeVisible();

    // Modal should still be open
    await expect(page.locator('h2:has-text("Add New Question")')).toBeVisible();

    // Fill only question
    await page.locator('textarea[placeholder*="Enter the question text"]').fill('Test question?');
    await page.locator('button:has-text("Add Question")').click();

    // Should still show answer error
    await expect(page.locator('text=Answer is required')).toBeVisible();
    await expect(page.locator('text=Question is required')).not.toBeVisible();

    // Fill answer
    await page.locator('textarea[placeholder*="Enter the answer text"]').fill('Test answer');
    await page.locator('button:has-text("Add Question")').click();

    // Wait for modal to close
    await page.waitForTimeout(1000);

    // Modal should be closed and question should appear
    await expect(page.locator('h2:has-text("Add New Question")')).not.toBeVisible();
    await expect(page.locator('text=Test question?')).toBeVisible();
  });

  test('should allow adding multiple questions sequentially', async ({ page }) => {
    // Create a benchmark
    await helpers.navigateToTab('curator');
    await page.locator('button:has-text("Create New Benchmark")').click();
    await page.locator('input[placeholder*="Science Questions Benchmark"]').fill('Multi-Question Test');
    await page.locator('button:has-text("Create Benchmark")').click();
    await page.waitForTimeout(1000);

    // Add first question
    await page.locator('button:has-text("Add Question")').click();
    await page.locator('textarea[placeholder*="Enter the question text"]').fill('Question 1?');
    await page.locator('textarea[placeholder*="Enter the answer text"]').fill('Answer 1');
    await page.locator('button:has-text("Add Question")').click();
    await page.waitForTimeout(1000);

    // Verify first question
    await expect(page.locator('text=Question 1?')).toBeVisible();
    await expect(page.locator('text=1 of 1 questions')).toBeVisible();

    // Add second question
    await page.locator('button:has-text("Add Question")').click();
    await page.locator('textarea[placeholder*="Enter the question text"]').fill('Question 2?');
    await page.locator('textarea[placeholder*="Enter the answer text"]').fill('Answer 2');
    await page.locator('button:has-text("Add Question")').click();
    await page.waitForTimeout(1000);

    // Verify second question
    await expect(page.locator('text=Question 2?')).toBeVisible();
    await expect(page.locator('text=1 of 2 questions')).toBeVisible();

    // Navigate between questions
    await page.locator('button:has-text("Previous")').click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Question 1?')).toBeVisible();

    await page.locator('button:has-text("Next")').click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Question 2?')).toBeVisible();
  });

  test('should maintain question search functionality with manual questions', async ({ page }) => {
    // Create benchmark with multiple questions
    await helpers.navigateToTab('curator');
    await page.locator('button:has-text("Create New Benchmark")').click();
    await page.locator('input[placeholder*="Science Questions Benchmark"]').fill('Search Test');
    await page.locator('button:has-text("Create Benchmark")').click();
    await page.waitForTimeout(1000);

    // Add math question
    await page.locator('button:has-text("Add Question")').click();
    await page.locator('textarea[placeholder*="Enter the question text"]').fill('What is 2+2?');
    await page.locator('textarea[placeholder*="Enter the answer text"]').fill('4');
    await page.locator('input[placeholder*="math, geometry, basic"]').fill('math');
    await page.locator('button:has-text("Add Question")').click();
    await page.waitForTimeout(1000);

    // Add science question
    await page.locator('button:has-text("Add Question")').click();
    await page.locator('textarea[placeholder*="Enter the question text"]').fill('What is H2O?');
    await page.locator('textarea[placeholder*="Enter the answer text"]').fill('Water');
    await page.locator('input[placeholder*="math, geometry, basic"]').fill('chemistry');
    await page.locator('button:has-text("Add Question")').click();
    await page.waitForTimeout(1000);

    // Verify both questions exist
    await expect(page.locator('text=2 of 2 questions')).toBeVisible();

    // Search for math question
    const searchInput = page.locator('input[placeholder*="Search questions"]');
    await searchInput.fill('2+2');
    await page.waitForTimeout(500);

    // Should show only math question
    await expect(page.locator('text=1 of 2 questions')).toBeVisible();
    await expect(page.locator('text=What is 2+2?')).toBeVisible();

    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(500);

    // Should show both questions again
    await expect(page.locator('text=2 of 2 questions')).toBeVisible();

    // Search for science question
    await searchInput.fill('H2O');
    await page.waitForTimeout(500);

    // Should show only science question
    await expect(page.locator('text=1 of 2 questions')).toBeVisible();
    await expect(page.locator('text=What is H2O?')).toBeVisible();
  });

  test.afterEach(async () => {
    await helpers.cleanupTempFiles();
  });
});
