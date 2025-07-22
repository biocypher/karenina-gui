import { Page } from '@playwright/test';
import { SELECTORS } from '../fixtures/test-data';
import { TEST_CONFIG } from '../test-config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Helper utilities for E2E tests
 */

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Navigate to a specific tab in the application
   */
  async navigateToTab(tabName: 'extractor' | 'generator' | 'curator' | 'benchmark') {
    const selector = SELECTORS.navigation[`${tabName}Tab` as keyof typeof SELECTORS.navigation];
    await this.page.click(selector);
    await this.page.waitForTimeout(500); // Allow tab to load
  }

  /**
   * Wait for the application to be fully loaded
   */
  async waitForAppLoad() {
    // Wait for the main header with Karenina title to be visible
    await this.page.waitForSelector('h1:has-text("Karenina")', {
      timeout: TEST_CONFIG.timeouts.mediumOperation,
    });

    // Also wait for the tab navigation to be visible
    await this.page.waitForSelector('button:has-text("Question Extractor")', {
      timeout: TEST_CONFIG.timeouts.shortOperation,
    });
  }

  /**
   * Check if an element exists on the page
   */
  async elementExists(selector: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { timeout: TEST_CONFIG.timeouts.shortOperation });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Upload a file using the file input
   */
  async uploadFile(filePath: string, inputSelector: string = SELECTORS.fileUpload.fileInput) {
    await this.page.setInputFiles(inputSelector, filePath);
  }

  /**
   * Create a temporary test file for upload tests
   */
  async createTempFile(filename: string, content: string): Promise<string> {
    const tempDir = path.join(process.cwd(), 'tests/e2e/data');
    const filePath = path.join(tempDir, filename);

    // Ensure directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    fs.writeFileSync(filePath, content);
    return filePath;
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles() {
    const tempDir = path.join(process.cwd(), 'tests/e2e/data');

    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      files.forEach((file: string) => {
        if (file.startsWith('temp-')) {
          fs.unlinkSync(path.join(tempDir, file));
        }
      });
    }
  }
}
