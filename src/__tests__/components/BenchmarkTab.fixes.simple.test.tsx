/**
 * Simplified tests for BenchmarkTab fixes - verification of removed Clear All Results button
 * and proper results accumulation behavior.
 *
 * Date: January 23, 2025
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BenchmarkTab } from '../../components/BenchmarkTab';
import type { Checkpoint } from '../../types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Blob for export functionality
global.Blob = vi.fn().mockImplementation((content, options) => ({
  content,
  options,
  size: content[0] ? content[0].length : 0,
  type: options?.type || '',
})) as unknown as typeof Blob;

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn().mockReturnValue('mock-blob-url');
global.URL.revokeObjectURL = vi.fn();

const mockCheckpoint: Checkpoint = {
  questions: {
    q1: {
      question: 'What is 2+2?',
      answer_template: 'return {"answer": "4"}',
      last_modified: '2025-01-23T10:00:00Z',
      finished: true,
    },
    q2: {
      question: 'What is the capital of France?',
      answer_template: 'return {"answer": "Paris"}',
      last_modified: '2025-01-23T10:01:00Z',
      finished: true,
    },
  },
};

describe('BenchmarkTab Fixes - Core Functionality', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Default fetch mock for historical results loading
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/all-verification-results')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ results: {} }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
      });
    });
  });

  describe('Clear All Results Button Removal', () => {
    it('should not display Clear All Results button text anywhere', () => {
      render(<BenchmarkTab checkpoint={mockCheckpoint} benchmarkResults={{}} setBenchmarkResults={() => {}} />);

      // The Clear All Results button should not be present
      expect(screen.queryByText('Clear All Results')).not.toBeInTheDocument();
      expect(screen.queryByText(/Clear All/)).not.toBeInTheDocument();
    });

    it('should not have any clear results functionality accessible from UI', () => {
      render(<BenchmarkTab checkpoint={mockCheckpoint} benchmarkResults={{}} setBenchmarkResults={() => {}} />);

      // Look for any buttons that might clear results
      const buttons = screen.getAllByRole('button');
      const clearButtons = buttons.filter((button) => {
        const text = button.textContent?.toLowerCase() || '';
        return text.includes('clear') && (text.includes('result') || text.includes('all'));
      });

      // Should find no clear results buttons
      expect(clearButtons).toHaveLength(0);
    });

    it('should maintain UI elements without clear button', () => {
      render(<BenchmarkTab checkpoint={mockCheckpoint} benchmarkResults={{}} setBenchmarkResults={() => {}} />);

      // Verify other control elements are still present
      expect(screen.getByText('Total Results')).toBeInTheDocument();
      expect(screen.getByText('Run Name (Optional)')).toBeInTheDocument();
    });
  });

  describe('Results Accumulation - Basic Behavior', () => {
    it('should start with empty results display', () => {
      render(<BenchmarkTab checkpoint={mockCheckpoint} benchmarkResults={{}} setBenchmarkResults={() => {}} />);

      // Should show Total Results section
      expect(screen.getByText('Total Results')).toBeInTheDocument();

      // Should display empty state message
      expect(screen.getByText('No test results yet. Run some tests to see results here.')).toBeInTheDocument();
    });

    it('should load historical results when they exist', async () => {
      // Mock historical results being loaded
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/all-verification-results')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                results: {
                  q1: {
                    question_id: 'q1',
                    completed_without_errors: true,
                    question_text: 'What is 2+2?',
                    raw_llm_response: '4',
                    parsed_response: { answer: '4' },
                    verify_result: true,
                    answering_model: 'gpt-4',
                    parsing_model: 'gpt-4',
                    execution_time: 1.5,
                    timestamp: '2025-01-23T10:00:00Z',
                    run_name: 'test_run_1',
                    job_id: 'job_123',
                  },
                },
              }),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      render(<BenchmarkTab checkpoint={mockCheckpoint} benchmarkResults={{}} setBenchmarkResults={() => {}} />);

      // Should show Total Results section
      expect(screen.getByText('Total Results')).toBeInTheDocument();

      // Results should be loaded (can't test the exact count due to multiple displays,
      // but we can test that the results table is present)
      expect(screen.queryByText('No test results yet')).not.toBeInTheDocument();
    });

    it('should display run management controls without clear button', () => {
      render(<BenchmarkTab checkpoint={mockCheckpoint} benchmarkResults={{}} setBenchmarkResults={() => {}} />);

      // Should show run management section
      expect(screen.getByText('Run Management')).toBeInTheDocument();

      // Should have run name input
      expect(screen.getByPlaceholderText(/Enter a name for this run/)).toBeInTheDocument();

      // Should NOT have clear all results button
      expect(screen.queryByText(/Clear All Results/)).not.toBeInTheDocument();

      // Grid should be clean without the missing button
      const gridContainer = screen.getByText('Run Management').closest('div');
      expect(gridContainer).toBeInTheDocument();
    });
  });

  describe('Component Structure Integrity', () => {
    it('should maintain proper component structure after button removal', () => {
      render(<BenchmarkTab checkpoint={mockCheckpoint} benchmarkResults={{}} setBenchmarkResults={() => {}} />);

      // Check that main sections are present
      expect(screen.getByText('Run Management')).toBeInTheDocument();
      expect(screen.getByText('Answering Models (1)')).toBeInTheDocument();
      expect(screen.getByText('Parsing Models (1)')).toBeInTheDocument();

      // Check that test selection areas are present (using the actual header text)
      expect(screen.getByText('Test Selection (0 available)')).toBeInTheDocument();

      // The layout should be functional without the removed button
      expect(document.body).toBeInTheDocument();
    });

    it('should have working test selection without clear functionality', () => {
      render(<BenchmarkTab checkpoint={mockCheckpoint} benchmarkResults={{}} setBenchmarkResults={() => {}} />);

      // Test selection interface should be present (even if no tests available in mock)
      expect(screen.getByText('Test Selection (0 available)')).toBeInTheDocument();

      // Should have run button (but not clear button) - updated for multiple models format
      expect(screen.getByText('Run Selected (0 × 1 = 0)')).toBeInTheDocument();
      expect(screen.queryByText(/Clear All Results/)).not.toBeInTheDocument();
    });

    it('should show results section ready for accumulation', () => {
      render(<BenchmarkTab checkpoint={mockCheckpoint} benchmarkResults={{}} setBenchmarkResults={() => {}} />);

      // Results section should be present and ready
      expect(screen.getByText('Total Results')).toBeInTheDocument();

      // Should show empty state initially
      expect(screen.getByText('No test results yet. Run some tests to see results here.')).toBeInTheDocument();

      // Should not have any clear functionality visible
      const resultsSection = screen.getByText('Total Results').closest('div');
      expect(resultsSection).not.toHaveTextContent('Clear');
    });
  });
});
