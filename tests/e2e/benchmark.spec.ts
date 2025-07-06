import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Benchmark Tab', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await page.goto('/');
    await helpers.waitForAppLoad();
    await helpers.navigateToTab('benchmark');
  });

  test('should display benchmark tab with default configuration', async ({ page }) => {
    // Check main sections
    await expect(page.locator('h3:has-text("Answering Models (1)")')).toBeVisible();
    await expect(page.locator('h3:has-text("Parsing Models (1)")')).toBeVisible();
    await expect(page.locator('h3:has-text("Evaluation Settings")')).toBeVisible();
    await expect(page.locator('h3:has-text("Verification Control")')).toBeVisible();
    await expect(page.locator('h3:has-text("Run Management")')).toBeVisible();

    // Check default model sections exist
    await expect(page.locator('h4:has-text("Model 1")')).toHaveCount(2); // One for answering, one for parsing

    // Check interface options are visible (use first occurrence)
    await expect(page.locator('text=LangChain').first()).toBeVisible();
    await expect(page.locator('text=OpenRouter').first()).toBeVisible();

    // Check evaluation settings
    await expect(page.locator('input[type="checkbox"]').first()).toBeChecked(); // Correctness should be checked by default

    // Check that no tests are available initially
    await expect(page.locator('text=Test Selection (0 available)')).toBeVisible();
    await expect(page.locator('text=No finished templates available')).toBeVisible();
  });

  test('should add and configure new answering model', async ({ page }) => {
    // Click Add Model button for answering models (first one is for answering models)
    await page.locator('button:has-text("Add Model")').first().click();

    // Verify new model section appears
    await expect(page.locator('h4:has-text("Model 2")')).toBeVisible();

    // Configure the new model (use more specific selectors)
    const providerInputs = page.locator('input[placeholder*="google_genai"]');
    const modelInputs = page.locator('input[placeholder*="gpt-4"]');

    await providerInputs.nth(1).fill('openai');
    await modelInputs.nth(1).fill('gpt-4');

    // Verify the configuration was saved
    await expect(providerInputs.nth(1)).toHaveValue('openai');
    await expect(modelInputs.nth(1)).toHaveValue('gpt-4');

    // Check that the model count is updated
    await expect(page.locator('h3:has-text("Answering Models (2)")')).toBeVisible();
  });

  test('should add and configure new parsing model', async ({ page }) => {
    // Click Add Model button for parsing models (second Add Model button)
    await page.locator('button:has-text("Add Model")').nth(1).click();

    // Wait for the new model section to appear
    await page.waitForTimeout(500);

    // Verify we now have 2 parsing models
    await expect(page.locator('h3:has-text("Parsing Models (2)")')).toBeVisible();

    // Configure the new parsing model using more specific approach
    const allProviderInputs = page.locator('input[placeholder*="google_genai"]');
    const allModelInputs = page.locator('input[placeholder*="gpt-4"]');

    // The new parsing model should be the last one
    await allProviderInputs.last().fill('anthropic');
    await allModelInputs.last().fill('claude-3-opus');

    // Verify the configuration was saved
    await expect(allProviderInputs.last()).toHaveValue('anthropic');
    await expect(allModelInputs.last()).toHaveValue('claude-3-opus');

    // Check that the model count is updated
    await expect(page.locator('h3:has-text("Parsing Models (2)")')).toBeVisible();
  });

  test('should adjust temperature slider', async ({ page }) => {
    // Find and adjust the first temperature slider
    const temperatureSlider = page.locator('input[type="range"]').first();

    // Set temperature to 0.5
    await temperatureSlider.fill('0.5');

    // Verify the temperature display is updated
    await expect(page.locator('text=Temperature: 0.5')).toBeVisible();
  });

  test('should toggle evaluation settings', async ({ page }) => {
    // Check initial state - Correctness should be checked
    const correctnessCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(correctnessCheckbox).toBeChecked();

    // Toggle rubric evaluation
    const rubricCheckbox = page.locator('input[type="checkbox"]').nth(1);
    await rubricCheckbox.check();
    await expect(rubricCheckbox).toBeChecked();

    // Toggle correctness off
    await correctnessCheckbox.uncheck();
    await expect(correctnessCheckbox).not.toBeChecked();
  });

  test('should update run management settings', async ({ page }) => {
    // Update run name
    const runNameInput = page.locator('input[placeholder*="Enter a name for this run"]');
    await runNameInput.fill('Test Run 1');
    await expect(runNameInput).toHaveValue('Test Run 1');

    // Update number of replicates
    const replicatesInput = page.locator('input[type="number"]');
    await replicatesInput.fill('3');
    await expect(replicatesInput).toHaveValue('3');

    // Verify stats are updated
    await expect(page.locator('text=3').last()).toBeVisible(); // Total Runs per Question should be 3
  });

  test('should show correct model combination statistics', async ({ page }) => {
    // Add one more answering model
    await page.locator('button:has-text("Add Model")').first().click();

    // Add one more parsing model
    await page.locator('button:has-text("Add Model")').nth(1).click();

    // Set replicates to 2
    await page.locator('input[type="number"]').fill('2');

    // Verify the statistics
    await expect(page.locator('text=2').nth(1)).toBeVisible(); // 2 Answering Models
    await expect(page.locator('text=2').nth(2)).toBeVisible(); // 2 Parsing Models
    await expect(page.locator('text=4').last()).toBeVisible(); // Total Runs per Question (2×2×2)
  });

  test('should handle OpenRouter interface selection', async ({ page }) => {
    // Select OpenRouter interface for first answering model using specific selector
    await page.locator('input[type="radio"][value="openrouter"]').first().check();

    // Verify OpenRouter is selected
    await expect(page.locator('input[type="radio"][value="openrouter"]').first()).toBeChecked();

    // Check that model configuration fields are still present
    await expect(page.locator('input[placeholder*="google_genai"]').first()).toBeVisible();
  });

  test('should handle Manual interface selection', async ({ page }) => {
    // Select Manual interface for first answering model using specific selector
    await page.locator('input[type="radio"][value="manual"]').first().check();

    // Verify Manual is selected
    await expect(page.locator('input[type="radio"][value="manual"]').first()).toBeChecked();

    // Model field should still be visible
    await expect(page.locator('input[placeholder*="gpt-4"]').first()).toBeVisible();
  });

  test('should display system prompt configuration', async ({ page }) => {
    // Check that system prompt sections are visible
    await expect(page.locator('text=System Prompt').first()).toBeVisible();

    // Check for truncated system prompt text (may be collapsed)
    await expect(page.locator('text=You are an expert assistant').first()).toBeVisible();
  });

  test('should show empty test selection when no finished templates', async ({ page }) => {
    // Verify empty state
    await expect(page.locator('text=Test Selection (0 available)')).toBeVisible();
    await expect(page.locator('text=No finished templates available')).toBeVisible();

    // Verify buttons are disabled
    await expect(page.locator('button:has-text("Select All")')).toBeDisabled();
    await expect(page.locator('button:has-text("Run Selected")')).toBeDisabled();

    // Verify empty test results
    await expect(page.locator('text=Test Results (0)')).toBeVisible();
    await expect(page.locator('text=No test results yet')).toBeVisible();
  });

  test.afterEach(async () => {
    await helpers.cleanupTempFiles();
  });
});
