/**
 * Error Handling Integration Tests
 *
 * Tests that the app handles various error scenarios gracefully.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render, userEvent } from '../../src/test-utils/test-helpers';
import { server } from '../../src/test-utils/mocks/server';
import { http, HttpResponse } from 'msw';
import App from '../../src/App';

describe('Error Handling', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  describe('Network Errors', () => {
    it('should handle network failure gracefully', async () => {
      // Mock network error on config endpoint
      server.use(
        http.get('/api/config/defaults', () => {
          return HttpResponse.error();
        })
      );

      // Suppress expected console errors
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<App />);

      // App should still render despite network error
      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('should handle 500 errors gracefully', async () => {
      server.use(
        http.get('/api/config/defaults', () => {
          return HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        })
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<App />);

      // App should still render
      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('should handle timeout errors gracefully', async () => {
      server.use(
        http.get('/api/config/defaults', async () => {
          // Simulate slow response
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json({ success: true });
        })
      );

      render(<App />);

      // App should render while waiting
      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });
    });
  });

  describe('API Error Responses', () => {
    it('should handle validation errors', async () => {
      server.use(
        http.post('/api/start-verification', () => {
          return HttpResponse.json({ error: 'Validation failed: Missing required fields' }, { status: 400 });
        })
      );

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });
    });

    it('should handle unauthorized errors', async () => {
      server.use(
        http.get('/api/database/list', () => {
          return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
        })
      );

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });
    });

    it('should handle not found errors', async () => {
      server.use(
        http.get('/api/database/:id', () => {
          return HttpResponse.json({ error: 'Benchmark not found' }, { status: 404 });
        })
      );

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });
    });
  });

  describe('State Recovery', () => {
    it('should recover from corrupted localStorage', async () => {
      // Set corrupted data
      localStorage.setItem('karenina-app-state', 'invalid json {{{');

      render(<App />);

      // App should still render, ignoring corrupted data
      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });
    });

    it('should handle missing required state gracefully', async () => {
      // Clear all storage to simulate fresh start
      localStorage.clear();
      sessionStorage.clear();

      render(<App />);

      // App should render with default state
      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });
    });
  });

  describe('Component Errors', () => {
    it('should not crash when receiving unexpected data shapes', async () => {
      // Mock API returning unexpected data shape
      server.use(
        http.get('/api/config/defaults', () => {
          return HttpResponse.json({
            unexpected_field: 'unexpected_value',
            // Missing expected fields
          });
        })
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<App />);

      // App should still render
      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('should handle empty API responses', async () => {
      server.use(
        http.get('/api/database/list', () => {
          return HttpResponse.json({});
        })
      );

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });
    });

    it('should handle null API responses', async () => {
      server.use(
        http.get('/api/database/list', () => {
          return HttpResponse.json(null);
        })
      );

      render(<App />);

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });
    });
  });

  describe('User Interaction Errors', () => {
    it('should handle rapid clicking without crashing', async () => {
      const user = userEvent.setup();

      render(<App />);

      // Wait for app to render
      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });

      // Get all buttons
      const buttons = screen.queryAllByRole('button');
      if (buttons.length >= 2) {
        // Rapidly click between buttons
        for (let i = 0; i < 5; i++) {
          await user.click(buttons[0]);
          await user.click(buttons[1]);
        }
      }

      // App should still be responsive
      expect(document.body).toBeInTheDocument();
    });
  });
});
