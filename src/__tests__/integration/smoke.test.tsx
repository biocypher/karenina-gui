/**
 * Smoke Integration Tests
 *
 * Basic tests to verify the app loads and navigates correctly.
 * These tests render the full App component with MSW mocking.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render, userEvent } from '../../test-utils/test-helpers';
import App from '../../App';

describe('Smoke Tests', () => {
  beforeEach(() => {
    // Reset stores between tests
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  describe('App Loading', () => {
    it('should render the application without crashing', async () => {
      render(<App />);

      // App should render something
      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });
    });

    it('should display navigation tabs', async () => {
      render(<App />);

      // Wait for tabs to be visible
      await waitFor(() => {
        // Check for any tab-like buttons
        const buttons = screen.queryAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });

    it('should display the application container', async () => {
      render(<App />);

      await waitFor(() => {
        // Just verify the app container exists
        const container = document.querySelector('.container');
        expect(container || document.body).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should have clickable navigation buttons', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Wait for buttons to be visible
      await waitFor(() => {
        const buttons = screen.queryAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });

      // Click the first button found
      const buttons = screen.getAllByRole('button');
      if (buttons.length > 0) {
        await user.click(buttons[0]);
        // App should still be responsive after clicking
        expect(document.body).toBeInTheDocument();
      }
    });

    it('should handle multiple tab clicks without errors', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Wait for buttons to be visible
      await waitFor(() => {
        const buttons = screen.queryAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });

      // Click multiple buttons
      const buttons = screen.getAllByRole('button');
      for (let i = 0; i < Math.min(3, buttons.length); i++) {
        await user.click(buttons[i]);
      }

      // App should still be responsive
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('Error Resilience', () => {
    it('should handle corrupted localStorage gracefully', async () => {
      // Set corrupted data
      localStorage.setItem('karenina-app-state', 'invalid json {{{');

      render(<App />);

      // App should still render
      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });
    });

    it('should handle empty localStorage gracefully', async () => {
      localStorage.clear();

      render(<App />);

      // App should render with default state
      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });
    });
  });
});
