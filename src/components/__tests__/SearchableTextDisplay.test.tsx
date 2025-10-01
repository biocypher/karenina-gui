import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { SearchableTextDisplay } from '../SearchableTextDisplay';
import '@testing-library/jest-dom';

describe('SearchableTextDisplay', () => {
  const sampleText = `This is a sample response for testing search.
It contains multiple lines of content.
TESTING should match when case insensitive search is enabled.
Numbers like 123 and 456 are also present here.
Special characters: @#$% and symbols work too.`;

  // Helper function to find match counter text across multiple elements
  const getMatchCounter = (currentMatch: number, totalMatches: number) => {
    return screen.getByText((content, element) => {
      const hasText = element?.textContent === `Match ${currentMatch} of ${totalMatches}`;
      return hasText;
    });
  };

  beforeEach(() => {
    // Clear any previous renders
  });

  describe('Basic Rendering', () => {
    it('renders the text content correctly', () => {
      render(<SearchableTextDisplay text={sampleText} />);
      expect(screen.getByText(/This is a sample response/i)).toBeInTheDocument();
    });

    it('renders search input field', () => {
      render(<SearchableTextDisplay text={sampleText} />);
      const searchInput = screen.getByPlaceholderText('Search in response...');
      expect(searchInput).toBeInTheDocument();
    });

    it('renders case sensitive checkbox', () => {
      render(<SearchableTextDisplay text={sampleText} />);
      expect(screen.getByLabelText('Case sensitive')).toBeInTheDocument();
    });

    it('renders regex checkbox', () => {
      render(<SearchableTextDisplay text={sampleText} />);
      expect(screen.getByLabelText('Use regex')).toBeInTheDocument();
    });

    it('applies custom className to text display', () => {
      const { container } = render(<SearchableTextDisplay text={sampleText} className="custom-class" />);
      const preElement = container.querySelector('pre');
      expect(preElement).toHaveClass('custom-class');
    });
  });

  describe('Search Functionality', () => {
    it('displays match counter when search term is entered', async () => {
      render(<SearchableTextDisplay text={sampleText} />);
      const searchInput = screen.getByPlaceholderText('Search in response...');

      fireEvent.change(searchInput, { target: { value: 'testing' } });

      await waitFor(() => {
        expect(screen.getByText(/Match/)).toBeInTheDocument();
      });
    });

    it('finds matches case insensitively by default', async () => {
      render(<SearchableTextDisplay text={sampleText} />);
      const searchInput = screen.getByPlaceholderText('Search in response...');

      fireEvent.change(searchInput, { target: { value: 'testing' } });

      await waitFor(() => {
        // Should find both "testing" and "TESTING"
        expect(getMatchCounter(1, 2)).toBeInTheDocument();
      });
    });

    it('finds matches case sensitively when enabled', async () => {
      render(<SearchableTextDisplay text={sampleText} />);
      const searchInput = screen.getByPlaceholderText('Search in response...');
      const caseSensitiveCheckbox = screen.getByLabelText('Case sensitive');

      fireEvent.click(caseSensitiveCheckbox);
      fireEvent.change(searchInput, { target: { value: 'testing' } });

      await waitFor(() => {
        // Should only find lowercase "testing"
        expect(getMatchCounter(1, 1)).toBeInTheDocument();
      });
    });

    it('shows "No matches found" when no matches exist', async () => {
      render(<SearchableTextDisplay text={sampleText} />);
      const searchInput = screen.getByPlaceholderText('Search in response...');

      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText('No matches found')).toBeInTheDocument();
      });
    });

    it('handles empty search query', () => {
      render(<SearchableTextDisplay text={sampleText} />);
      const searchInput = screen.getByPlaceholderText('Search in response...');

      fireEvent.change(searchInput, { target: { value: '' } });

      expect(screen.queryByText(/Match/)).not.toBeInTheDocument();
    });
  });

  describe('Regex Search', () => {
    it('finds matches using regex pattern', async () => {
      render(<SearchableTextDisplay text={sampleText} />);
      const searchInput = screen.getByPlaceholderText('Search in response...');
      const regexCheckbox = screen.getByLabelText('Use regex');

      fireEvent.click(regexCheckbox);
      fireEvent.change(searchInput, { target: { value: '\\d+' } }); // Match numbers

      await waitFor(() => {
        expect(getMatchCounter(1, 2)).toBeInTheDocument(); // Should find 123 and 456
      });
    });

    it('shows error for invalid regex pattern', async () => {
      render(<SearchableTextDisplay text={sampleText} />);
      const searchInput = screen.getByPlaceholderText('Search in response...');
      const regexCheckbox = screen.getByLabelText('Use regex');

      fireEvent.click(regexCheckbox);
      fireEvent.change(searchInput, { target: { value: '[invalid(' } }); // Invalid regex

      await waitFor(() => {
        expect(screen.getByText(/Invalid regex/i)).toBeInTheDocument();
      });
    });

    it('respects case sensitivity with regex', async () => {
      render(<SearchableTextDisplay text={sampleText} />);
      const searchInput = screen.getByPlaceholderText('Search in response...');
      const regexCheckbox = screen.getByLabelText('Use regex');
      const caseSensitiveCheckbox = screen.getByLabelText('Case sensitive');

      fireEvent.click(regexCheckbox);
      fireEvent.click(caseSensitiveCheckbox);
      fireEvent.change(searchInput, { target: { value: 'testing' } });

      await waitFor(() => {
        // Should only find lowercase "testing"
        expect(getMatchCounter(1, 1)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('shows navigation buttons when matches exist', async () => {
      render(<SearchableTextDisplay text={sampleText} />);
      const searchInput = screen.getByPlaceholderText('Search in response...');

      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByTitle('Previous match')).toBeInTheDocument();
        expect(screen.getByTitle('Next match')).toBeInTheDocument();
      });
    });

    it('does not show navigation buttons when no matches', async () => {
      render(<SearchableTextDisplay text={sampleText} />);
      const searchInput = screen.getByPlaceholderText('Search in response...');

      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.queryByTitle('Previous match')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Next match')).not.toBeInTheDocument();
      });
    });

    it('navigates to next match', async () => {
      render(<SearchableTextDisplay text={sampleText} />);
      const searchInput = screen.getByPlaceholderText('Search in response...');

      fireEvent.change(searchInput, { target: { value: 'search' } });

      await waitFor(() => {
        expect(getMatchCounter(1, 2)).toBeInTheDocument();
      });

      const nextButton = screen.getByTitle('Next match');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(getMatchCounter(2, 2)).toBeInTheDocument();
      });
    });

    it('wraps to first match when navigating past last', async () => {
      render(<SearchableTextDisplay text={sampleText} />);
      const searchInput = screen.getByPlaceholderText('Search in response...');

      fireEvent.change(searchInput, { target: { value: 'search' } });

      await waitFor(() => {
        expect(getMatchCounter(1, 2)).toBeInTheDocument();
      });

      const nextButton = screen.getByTitle('Next match');
      fireEvent.click(nextButton); // Go to match 2
      fireEvent.click(nextButton); // Should wrap to match 1

      await waitFor(() => {
        expect(getMatchCounter(1, 2)).toBeInTheDocument();
      });
    });

    it('navigates to previous match', async () => {
      render(<SearchableTextDisplay text={sampleText} />);
      const searchInput = screen.getByPlaceholderText('Search in response...');

      fireEvent.change(searchInput, { target: { value: 'search' } });

      await waitFor(() => {
        expect(getMatchCounter(1, 2)).toBeInTheDocument();
      });

      const nextButton = screen.getByTitle('Next match');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(getMatchCounter(2, 2)).toBeInTheDocument();
      });

      const prevButton = screen.getByTitle('Previous match');
      fireEvent.click(prevButton);

      await waitFor(() => {
        expect(getMatchCounter(1, 2)).toBeInTheDocument();
      });
    });

    it('wraps to last match when navigating before first', async () => {
      render(<SearchableTextDisplay text={sampleText} />);
      const searchInput = screen.getByPlaceholderText('Search in response...');

      fireEvent.change(searchInput, { target: { value: 'search' } });

      await waitFor(() => {
        expect(getMatchCounter(1, 2)).toBeInTheDocument();
      });

      const prevButton = screen.getByTitle('Previous match');
      fireEvent.click(prevButton); // Should wrap to match 2

      await waitFor(() => {
        expect(getMatchCounter(2, 2)).toBeInTheDocument();
      });
    });
  });

  describe('Clear Search', () => {
    it('shows clear button when search term exists', async () => {
      render(<SearchableTextDisplay text={sampleText} />);
      const searchInput = screen.getByPlaceholderText('Search in response...');

      fireEvent.change(searchInput, { target: { value: 'search' } });

      await waitFor(() => {
        expect(screen.getByTitle('Clear search')).toBeInTheDocument();
      });
    });

    it('does not show clear button when search is empty', () => {
      render(<SearchableTextDisplay text={sampleText} />);
      expect(screen.queryByTitle('Clear search')).not.toBeInTheDocument();
    });

    it('clears search when clear button is clicked', async () => {
      render(<SearchableTextDisplay text={sampleText} />);
      const searchInput = screen.getByPlaceholderText('Search in response...');

      fireEvent.change(searchInput, { target: { value: 'search' } });

      await waitFor(() => {
        expect(screen.getByText(/Match/)).toBeInTheDocument();
      });

      const clearButton = screen.getByTitle('Clear search');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(searchInput).toHaveValue('');
        expect(screen.queryByText(/Match/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty text', () => {
      render(<SearchableTextDisplay text="" />);
      expect(screen.getByPlaceholderText('Search in response...')).toBeInTheDocument();
    });

    it('handles very long text', () => {
      const longText = 'word '.repeat(10000);
      render(<SearchableTextDisplay text={longText} />);
      expect(screen.getByPlaceholderText('Search in response...')).toBeInTheDocument();
    });

    it('handles special characters in search', async () => {
      render(<SearchableTextDisplay text={sampleText} />);
      const searchInput = screen.getByPlaceholderText('Search in response...');

      fireEvent.change(searchInput, { target: { value: '@#$%' } });

      await waitFor(() => {
        expect(getMatchCounter(1, 1)).toBeInTheDocument();
      });
    });

    it('resets match index when search query changes', async () => {
      render(<SearchableTextDisplay text={sampleText} />);
      const searchInput = screen.getByPlaceholderText('Search in response...');

      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(getMatchCounter(1, 2)).toBeInTheDocument();
      });

      const nextButton = screen.getByTitle('Next match');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(getMatchCounter(2, 2)).toBeInTheDocument();
      });

      // Change search query
      fireEvent.change(searchInput, { target: { value: 'sample' } });

      await waitFor(() => {
        // Should reset to match 1
        expect(getMatchCounter(1, 1)).toBeInTheDocument();
      });
    });

    it('handles multiline text correctly', async () => {
      const multilineText = 'Line 1\nLine 2\nLine 3';
      render(<SearchableTextDisplay text={multilineText} />);
      const searchInput = screen.getByPlaceholderText('Search in response...');

      fireEvent.change(searchInput, { target: { value: 'Line' } });

      await waitFor(() => {
        expect(getMatchCounter(1, 3)).toBeInTheDocument();
      });
    });
  });

  describe('UI State Management', () => {
    it('toggles case sensitive state correctly', () => {
      render(<SearchableTextDisplay text={sampleText} />);
      const checkbox = screen.getByLabelText('Case sensitive') as HTMLInputElement;

      expect(checkbox.checked).toBe(false);

      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);

      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(false);
    });

    it('toggles regex state correctly', () => {
      render(<SearchableTextDisplay text={sampleText} />);
      const checkbox = screen.getByLabelText('Use regex') as HTMLInputElement;

      expect(checkbox.checked).toBe(false);

      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);

      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(false);
    });
  });
});
