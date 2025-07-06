import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('LLM Chat Tab', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await page.goto('/');
    await helpers.waitForAppLoad();
    await helpers.navigateToTab('chat');
  });

  test('should display chat interface with default state', async ({ page }) => {
    // Check main chat interface elements
    await expect(page.locator('h3:has-text("Chat with LLM")')).toBeVisible();

    // Check initial state
    await expect(page.locator('text=Start a conversation')).toBeVisible();
    await expect(page.locator('text=Ask questions about your data')).toBeVisible();

    // Chat input should be present
    await expect(page.locator('textarea[placeholder*="Type your message"]')).toBeVisible();

    // Check for keyboard shortcut hint
    await expect(page.locator('text=Press Ctrl+Enter to send')).toBeVisible();
  });

  test('should enable send button when message is typed', async ({ page }) => {
    // Find message input
    const messageInput = page.locator('textarea[placeholder*="Type your message"]');

    // Type a message
    await messageInput.fill('Hello, how can you help me with my questions?');

    // Send button should now be enabled - look for the specific send button in the message area
    // Based on error, it's the purple button with send functionality
    const sendButton = page.locator('button.bg-purple-600, button.bg-purple-700').filter({ hasText: '' }); // Send button typically has no text, just icon
    await expect(
      sendButton.or(page.locator('button[type="submit"]').last()).or(page.locator('form button').last())
    ).toBeEnabled();
  });

  test('should show settings button', async ({ page }) => {
    // Check that there's a settings button by title attribute
    await expect(page.locator('button[title="Settings"]')).toBeVisible();
  });

  test('should handle keyboard shortcut Ctrl+Enter', async ({ page }) => {
    // Find message input
    const messageInput = page.locator('textarea[placeholder*="Type your message"]');

    // Type a message
    await messageInput.fill('Test message for keyboard shortcut');

    // Press Ctrl+Enter
    await messageInput.press('Control+Enter');

    // Message should be sent (input should be cleared or send button disabled)
    await expect(messageInput).toHaveValue('');
  });

  test('should show conversation counter', async ({ page }) => {
    // Check for message counter in footer
    await expect(page.locator('text=0 messages in conversation')).toBeVisible();
  });

  test('should handle empty message submission', async ({ page }) => {
    // Find message input
    const messageInput = page.locator('textarea[placeholder*="Type your message"]');

    // Try to send empty message by pressing Enter
    await messageInput.press('Enter');

    // Should not send anything (send button should remain disabled)
    const sendButton = page.locator('button.bg-purple-600, button.bg-purple-700').filter({ hasText: '' });
    await expect(sendButton.or(page.locator('form button').last())).toBeDisabled();

    // Message counter should still show 0
    await expect(page.locator('text=0 messages in conversation')).toBeVisible();
  });

  test('should display help text about functionality', async ({ page }) => {
    // Check that help text is displayed
    await expect(page.locator('text=Ask questions about your data')).toBeVisible();
    await expect(page.locator('text=get help with Pydantic classes')).toBeVisible();
    await expect(page.locator('text=discuss template improvements')).toBeVisible();
  });

  test('should show keyboard shortcut hint', async ({ page }) => {
    // Check for Ctrl+Enter hint
    await expect(page.locator('text=Press Ctrl+Enter to send')).toBeVisible();
  });

  test('should maintain message input focus', async ({ page }) => {
    // Find message input
    const messageInput = page.locator('textarea[placeholder*="Type your message"]');

    // Click on input to focus
    await messageInput.click();

    // Should be focused
    await expect(messageInput).toBeFocused();

    // Type some text
    await messageInput.fill('Test message');

    // Should maintain focus
    await expect(messageInput).toBeFocused();
  });

  test.afterEach(async () => {
    await helpers.cleanupTempFiles();
  });
});
