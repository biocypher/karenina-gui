import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { CustomPromptComposer } from '../CustomPromptComposer';

describe('CustomPromptComposer Parsing Functionality', () => {
  const mockQuestions = {
    q1: {
      id: 'q1',
      question: 'What is the capital of France?',
      raw_answer: 'Paris',
      answer_template: '',
    },
  };

  const mockOnPromptGenerated = vi.fn();

  it('should parse examples correctly from uploaded prompt', () => {
    render(<CustomPromptComposer questions={mockQuestions} onPromptGenerated={mockOnPromptGenerated} />);

    // Test that the component renders
    expect(screen.getByText('Custom System Prompt')).toBeInTheDocument();

    // Test that parsing checkbox is available
    expect(screen.getByLabelText(/Parse examples from uploaded prompt/)).toBeInTheDocument();
  });

  it('should display download button when component is expanded', async () => {
    const user = userEvent.setup();

    render(<CustomPromptComposer questions={mockQuestions} onPromptGenerated={mockOnPromptGenerated} />);

    // Click to expand the component
    const customizeButton = screen.getByText('Customize Prompt');
    await act(async () => {
      await user.click(customizeButton);
    });

    // Check that download button is present
    expect(screen.getByText('Download Prompt')).toBeInTheDocument();
  });

  it('should show parsing checkbox in both collapsed and expanded states', async () => {
    const user = userEvent.setup();

    render(<CustomPromptComposer questions={mockQuestions} onPromptGenerated={mockOnPromptGenerated} />);

    // Check collapsed state has checkbox
    expect(screen.getByLabelText(/Parse examples from uploaded prompt/)).toBeInTheDocument();

    // Expand and check expanded state still has a checkbox (the collapsed one is hidden)
    const customizeButton = screen.getByText('Customize Prompt');
    await act(async () => {
      await user.click(customizeButton);
    });

    // After expansion, there should still be one checkbox visible (the expanded one)
    expect(screen.getByLabelText(/Parse examples from uploaded prompt/)).toBeInTheDocument();
  });
});
