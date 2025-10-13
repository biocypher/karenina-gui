import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CustomExportDialog } from '../CustomExportDialog';
import type { ExportableResult } from '../../utils/export';

describe('CustomExportDialog', () => {
  const mockResults: ExportableResult[] = [
    {
      question_id: 'test1',
      question_text: 'Test question 1',
      raw_answer: 'Ground truth answer 1',
      raw_llm_response: 'Test response 1',
      answering_model: 'gpt-4',
      parsing_model: 'gpt-4',
      success: true,
      execution_time: 1.5,
      timestamp: '2025-08-28T12:00:00Z',
    },
    {
      question_id: 'test2',
      question_text: 'Test question 2',
      raw_answer: 'Ground truth answer 2',
      raw_llm_response: 'Test response 2',
      answering_model: 'claude-3',
      parsing_model: 'claude-3',
      success: false,
      execution_time: 2.0,
      timestamp: '2025-08-28T12:01:00Z',
      error: 'Parsing error',
    },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    results: mockResults,
    onExport: vi.fn(),
  };

  it('renders when open', () => {
    render(<CustomExportDialog {...defaultProps} />);
    expect(screen.getByText('Customize Export')).toBeInTheDocument();
    expect(screen.getByText(/2.*results/)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<CustomExportDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Customize Export')).not.toBeInTheDocument();
  });

  it('shows correct field count', () => {
    render(<CustomExportDialog {...defaultProps} />);
    // Should show all fields selected by default
    const fieldCountText = screen.getByText(/\d+ of \d+ fields selected/);
    expect(fieldCountText).toBeInTheDocument();
  });

  it('has functional buttons and format selection', () => {
    const mockOnExport = vi.fn();
    const mockOnClose = vi.fn();
    render(<CustomExportDialog {...defaultProps} onExport={mockOnExport} onClose={mockOnClose} />);

    // Check format selection works
    const csvRadio = screen.getByDisplayValue('csv');
    const jsonRadio = screen.getByDisplayValue('json');

    expect(csvRadio).toBeChecked();
    expect(jsonRadio).not.toBeChecked();

    // Check buttons exist
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export.*Fields/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select None' })).toBeInTheDocument();

    // Test cancel button
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('includes Deep-Judgment Analysis field group', () => {
    render(<CustomExportDialog {...defaultProps} />);

    // Check that the Deep-Judgment Analysis group header is present
    expect(screen.getByText('Deep-Judgment Analysis')).toBeInTheDocument();

    // Check for key deep-judgment fields
    expect(screen.getByText('Deep-Judgment Enabled')).toBeInTheDocument();
    expect(screen.getByText('Deep-Judgment Performed')).toBeInTheDocument();
    expect(screen.getByText('Extracted Excerpts')).toBeInTheDocument();
    expect(screen.getByText('Attribute Reasoning')).toBeInTheDocument();
    expect(screen.getByText('Attributes Without Excerpts')).toBeInTheDocument();
  });

  it('includes all 8 deep-judgment fields in export options', () => {
    render(<CustomExportDialog {...defaultProps} />);

    // Verify all 8 deep-judgment fields are present
    const deepJudgmentFields = [
      'Deep-Judgment Enabled',
      'Deep-Judgment Performed',
      'Extracted Excerpts',
      'Attribute Reasoning',
      'Stages Completed',
      'Model Calls',
      'Excerpt Retry Count',
      'Attributes Without Excerpts',
    ];

    deepJudgmentFields.forEach((fieldLabel) => {
      expect(screen.getByText(fieldLabel)).toBeInTheDocument();
    });
  });
});
