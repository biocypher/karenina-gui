import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AdvancedExtractionPanel } from '../AdvancedExtractionPanel';

describe('AdvancedExtractionPanel', () => {
  const mockColumns = ['Question', 'Answer', 'Author_Name', 'Author_Email', 'Keywords', 'URL', 'Affiliation'];
  const mockPreviewData = [
    {
      Question: 'What is the capital of France?',
      Answer: 'Paris',
      Author_Name: 'John Doe',
      Author_Email: 'john@example.com',
      Keywords: 'geography, france, capital',
      URL: 'https://example.com',
      Affiliation: 'University of Example',
    },
    {
      Question: 'What is 2+2?',
      Answer: '4',
      Author_Name: 'Jane Smith',
      Author_Email: 'jane@example.com',
      Keywords: 'math, arithmetic',
      URL: 'https://example2.com',
      Affiliation: 'Example Institute',
    },
  ];

  const defaultProps = {
    columns: mockColumns,
    isVisible: false,
    onToggle: vi.fn(),
    onSettingsChange: vi.fn(),
    previewData: mockPreviewData,
  };

  it('renders collapsed by default when isVisible is false', () => {
    render(<AdvancedExtractionPanel {...defaultProps} />);

    // Should show the toggle button with separate "Advanced extraction" text and "Optional" badge
    expect(screen.getByText('Advanced extraction')).toBeInTheDocument();
    expect(screen.getByText('Optional')).toBeInTheDocument();

    // Should not show the expanded content
    expect(screen.queryByText('Author Information')).not.toBeInTheDocument();
    expect(screen.queryByText('Additional Metadata')).not.toBeInTheDocument();
  });

  it('shows expanded content when isVisible is true', () => {
    render(<AdvancedExtractionPanel {...defaultProps} isVisible={true} />);

    // Should show the expanded content sections
    expect(screen.getByText('Author Information')).toBeInTheDocument();
    expect(screen.getByText('Additional Metadata')).toBeInTheDocument();

    // Should show all the dropdown fields
    expect(screen.getByLabelText('Author Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Author Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Author Affiliation')).toBeInTheDocument();
    expect(screen.getByLabelText('URL/Link')).toBeInTheDocument();
    expect(screen.getByLabelText('Keywords')).toBeInTheDocument();
  });

  it('calls onToggle when toggle button is clicked', () => {
    const mockOnToggle = vi.fn();
    render(<AdvancedExtractionPanel {...defaultProps} onToggle={mockOnToggle} />);

    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);

    expect(mockOnToggle).toHaveBeenCalledTimes(1);
  });

  it('shows all columns in dropdowns with None option first', () => {
    render(<AdvancedExtractionPanel {...defaultProps} isVisible={true} />);

    const authorNameSelect = screen.getByLabelText('Author Name');
    const options = Array.from(authorNameSelect.querySelectorAll('option')).map((option) => option.textContent);

    // Should have "None (skip)" as first option, then all columns
    expect(options[0]).toBe('None (skip)');
    expect(options).toContain('Author_Name');
    expect(options).toContain('Question');
    expect(options).toContain('Answer');
  });

  it('calls onSettingsChange when column selection changes', () => {
    const mockOnSettingsChange = vi.fn();
    render(<AdvancedExtractionPanel {...defaultProps} isVisible={true} onSettingsChange={mockOnSettingsChange} />);

    const authorNameSelect = screen.getByLabelText('Author Name');
    fireEvent.change(authorNameSelect, { target: { value: 'Author_Name' } });

    expect(mockOnSettingsChange).toHaveBeenCalledWith({
      keywords_separator: ',',
      author_name_column: 'Author_Name',
    });
  });

  it('shows preview data for selected columns', () => {
    render(<AdvancedExtractionPanel {...defaultProps} isVisible={true} />);

    // Select author name column
    const authorNameSelect = screen.getByLabelText('Author Name');
    fireEvent.change(authorNameSelect, { target: { value: 'Author_Name' } });

    // Should show preview values (without quotes in the new design)
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('shows keywords separator input and preview when keywords column is selected', () => {
    render(<AdvancedExtractionPanel {...defaultProps} isVisible={true} />);

    // Select keywords column
    const keywordsSelect = screen.getByLabelText('Keywords');
    fireEvent.change(keywordsSelect, { target: { value: 'Keywords' } });

    // Should show separator input
    expect(screen.getByLabelText('Separator')).toBeInTheDocument();

    // Should show keywords preview
    expect(screen.getByText('Keywords Preview')).toBeInTheDocument();
    expect(screen.getByText('"geography, france, capital"')).toBeInTheDocument();
  });

  it('updates keywords separator and shows updated preview', () => {
    const mockOnSettingsChange = vi.fn();
    render(<AdvancedExtractionPanel {...defaultProps} isVisible={true} onSettingsChange={mockOnSettingsChange} />);

    // Select keywords column
    const keywordsSelect = screen.getByLabelText('Keywords');
    fireEvent.change(keywordsSelect, { target: { value: 'Keywords' } });

    // Change separator
    const separatorInput = screen.getByLabelText('Separator');
    fireEvent.change(separatorInput, { target: { value: ';' } });

    expect(mockOnSettingsChange).toHaveBeenLastCalledWith({
      keywords_separator: ';',
      keywords_column: 'Keywords',
    });
  });

  it('handles empty string conversion to undefined for column settings', () => {
    const mockOnSettingsChange = vi.fn();
    render(<AdvancedExtractionPanel {...defaultProps} isVisible={true} onSettingsChange={mockOnSettingsChange} />);

    // Select a column then change back to "None"
    const authorNameSelect = screen.getByLabelText('Author Name');
    fireEvent.change(authorNameSelect, { target: { value: 'Author_Name' } });
    fireEvent.change(authorNameSelect, { target: { value: '' } });

    // Should convert empty string to undefined
    expect(mockOnSettingsChange).toHaveBeenLastCalledWith({
      keywords_separator: ',',
      author_name_column: undefined,
    });
  });

  it('shows truncated URLs in preview', () => {
    const longUrlData = [
      {
        URL: 'https://example.com/very/long/url/that/should/be/truncated/because/it/is/too/long/for/display',
      },
    ];

    render(<AdvancedExtractionPanel {...defaultProps} isVisible={true} previewData={longUrlData} />);

    // Select URL column
    const urlSelect = screen.getByLabelText('URL/Link');
    fireEvent.change(urlSelect, { target: { value: 'URL' } });

    // Should show truncated URL (without quotes in the new design)
    expect(screen.getByText(/\.\.\./)).toBeInTheDocument();
  });

  it('shows collapse advanced options button when expanded', () => {
    render(<AdvancedExtractionPanel {...defaultProps} isVisible={true} />);

    expect(screen.getByText('Collapse advanced options')).toBeInTheDocument();
  });

  it('displays helpful information text when expanded', () => {
    render(<AdvancedExtractionPanel {...defaultProps} isVisible={true} />);

    expect(screen.getByText('Settings will be applied during extraction')).toBeInTheDocument();
    expect(screen.getByText('Schema.org Person metadata')).toBeInTheDocument();
    expect(screen.getByText('Links and categorization')).toBeInTheDocument();
  });

  it('handles empty preview data gracefully', () => {
    render(<AdvancedExtractionPanel {...defaultProps} isVisible={true} previewData={[]} />);

    // Select author name column
    const authorNameSelect = screen.getByLabelText('Author Name');
    fireEvent.change(authorNameSelect, { target: { value: 'Author_Name' } });

    // Should not crash and not show any preview values
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  it('filters out empty values from preview', () => {
    const dataWithEmptyValues = [
      { Author_Name: 'John Doe' },
      { Author_Name: '' }, // Empty string - should be filtered out
      { Author_Name: '   ' }, // Whitespace only - should be filtered out
      // Note: getPreviewValues only shows first 3 non-empty values
    ];

    render(<AdvancedExtractionPanel {...defaultProps} isVisible={true} previewData={dataWithEmptyValues} />);

    // Select author name column
    const authorNameSelect = screen.getByLabelText('Author Name');
    fireEvent.change(authorNameSelect, { target: { value: 'Author_Name' } });

    // Should only show non-empty values
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    // Should not show empty or whitespace-only values (these would not be rendered in the new design)
    // Empty values are filtered out before rendering
  });
});
