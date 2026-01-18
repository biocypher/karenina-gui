/**
 * Tests for AdeleClassificationPanel component.
 *
 * Focus on:
 * - State reset when navigating between questions
 * - Loading classification from metadata (both object and JSON string formats)
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdeleClassificationPanel } from '../AdeleClassificationPanel';
import type { AdeleClassificationMetadata } from '../../../types/adele';

// Mock the Adele config store
vi.mock('../../../stores/useAdeleConfigStore', () => ({
  useAdeleConfigStore: vi.fn(() => ({
    modelConfig: {
      interface: 'langchain',
      provider: 'openai',
      modelName: 'gpt-4',
      temperature: 0.1,
      endpointBaseUrl: null,
      endpointApiKey: null,
    },
    selectedTraits: [],
    traitEvalMode: 'sequential',
    initializeFromDefaults: vi.fn(),
  })),
}));

// Mock the API
vi.mock('../../../services/adeleApi', () => ({
  adeleApi: {
    classifySingle: vi.fn(),
  },
}));

describe('AdeleClassificationPanel', () => {
  const sampleClassification: AdeleClassificationMetadata = {
    scores: { reasoning: 3, factuality: 4, clarity: 2 },
    labels: { reasoning: 'moderate', factuality: 'high', clarity: 'low' },
    classifiedAt: '2024-01-15T10:00:00Z',
    model: 'gpt-4',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading classification from metadata', () => {
    it('displays classification when metadata contains object format', () => {
      render(
        <AdeleClassificationPanel
          questionId="q1"
          questionText="What is the capital of France?"
          customMetadata={{ adele_classification: sampleClassification }}
        />
      );

      // Should show the classification summary
      expect(screen.getByText(/3 traits classified/)).toBeInTheDocument();
      expect(screen.getByText(/Re-classify/)).toBeInTheDocument();
    });

    it('displays classification when metadata contains JSON string format', () => {
      render(
        <AdeleClassificationPanel
          questionId="q1"
          questionText="What is the capital of France?"
          customMetadata={{ adele_classification: JSON.stringify(sampleClassification) }}
        />
      );

      // Should show the classification summary
      expect(screen.getByText(/3 traits classified/)).toBeInTheDocument();
      expect(screen.getByText(/Re-classify/)).toBeInTheDocument();
    });

    it('shows "No classification" when metadata is empty', () => {
      render(
        <AdeleClassificationPanel questionId="q1" questionText="What is the capital of France?" customMetadata={{}} />
      );

      expect(screen.getByText(/No classification yet/)).toBeInTheDocument();
      // Button should say "Classify" (not "Re-classify")
      expect(screen.getByRole('button', { name: /^Classify$/i })).toBeInTheDocument();
    });

    it('shows "No classification" when metadata is undefined', () => {
      render(<AdeleClassificationPanel questionId="q1" questionText="What is the capital of France?" />);

      expect(screen.getByText(/No classification yet/)).toBeInTheDocument();
    });
  });

  describe('state reset on question navigation', () => {
    it('resets to show correct classification when navigating to question with different metadata', async () => {
      const questionAClassification: AdeleClassificationMetadata = {
        scores: { reasoning: 5 },
        labels: { reasoning: 'very_high' },
        classifiedAt: '2024-01-15T10:00:00Z',
        model: 'gpt-4',
      };

      const questionBClassification: AdeleClassificationMetadata = {
        scores: { reasoning: 1, factuality: 2 },
        labels: { reasoning: 'low', factuality: 'low' },
        classifiedAt: '2024-01-16T10:00:00Z',
        model: 'claude-3',
      };

      const { rerender } = render(
        <AdeleClassificationPanel
          questionId="q1"
          questionText="Question A"
          customMetadata={{ adele_classification: JSON.stringify(questionAClassification) }}
        />
      );

      // Question A should show 1 trait
      expect(screen.getByText(/1 traits classified/)).toBeInTheDocument();

      // Navigate to question B by changing props
      rerender(
        <AdeleClassificationPanel
          questionId="q2"
          questionText="Question B"
          customMetadata={{ adele_classification: JSON.stringify(questionBClassification) }}
        />
      );

      // Question B should show 2 traits
      await waitFor(() => {
        expect(screen.getByText(/2 traits classified/)).toBeInTheDocument();
      });
    });

    it('shows "No classification" when navigating from classified to unclassified question', async () => {
      const { rerender } = render(
        <AdeleClassificationPanel
          questionId="q1"
          questionText="Question A"
          customMetadata={{ adele_classification: JSON.stringify(sampleClassification) }}
        />
      );

      // Question A has classification
      expect(screen.getByText(/3 traits classified/)).toBeInTheDocument();

      // Navigate to question B which has no classification
      rerender(<AdeleClassificationPanel questionId="q2" questionText="Question B" customMetadata={{}} />);

      // Question B should show no classification
      await waitFor(() => {
        expect(screen.getByText(/No classification yet/)).toBeInTheDocument();
      });
    });

    it('shows classification when navigating from unclassified to classified question', async () => {
      const { rerender } = render(
        <AdeleClassificationPanel questionId="q1" questionText="Question A" customMetadata={{}} />
      );

      // Question A has no classification
      expect(screen.getByText(/No classification yet/)).toBeInTheDocument();

      // Navigate to question B which has classification
      rerender(
        <AdeleClassificationPanel
          questionId="q2"
          questionText="Question B"
          customMetadata={{ adele_classification: JSON.stringify(sampleClassification) }}
        />
      );

      // Question B should show classification
      await waitFor(() => {
        expect(screen.getByText(/3 traits classified/)).toBeInTheDocument();
      });
    });

    it('resets expanded state when navigating between questions', async () => {
      const { rerender } = render(
        <AdeleClassificationPanel
          questionId="q1"
          questionText="Question A"
          customMetadata={{ adele_classification: JSON.stringify(sampleClassification) }}
        />
      );

      // Initially should be collapsed (show only 6 traits max, with "Expand" button)
      expect(screen.getByText(/Expand/)).toBeInTheDocument();

      // Navigate to another question
      rerender(
        <AdeleClassificationPanel
          questionId="q2"
          questionText="Question B"
          customMetadata={{ adele_classification: JSON.stringify(sampleClassification) }}
        />
      );

      // Should still be collapsed (not carry over expanded state)
      await waitFor(() => {
        expect(screen.getByText(/Expand/)).toBeInTheDocument();
      });
    });
  });
});
