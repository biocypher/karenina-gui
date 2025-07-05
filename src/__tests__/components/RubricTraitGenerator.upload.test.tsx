import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RubricTraitGenerator from '../../components/RubricTraitGenerator';
import { QuestionData } from '../../types';

// Mock the rubric store
vi.mock('../../stores/useRubricStore', () => ({
  useRubricStore: () => ({
    generatedSuggestions: [],
    isGeneratingTraits: false,
    lastError: null,
    config: {
      model_provider: 'google_genai',
      model_name: 'gemini-2.0-flash',
      temperature: 0.1,
      interface: 'langchain'
    },
    generateTraits: vi.fn(),
    clearError: vi.fn(),
    applyGeneratedTraits: vi.fn(),
    setConfig: vi.fn()
  })
}));

// Mock fetch for the default system prompt
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ prompt: 'Default system prompt' }),
  })
) as ReturnType<typeof vi.fn>;

describe('RubricTraitGenerator Upload Functionality', () => {
  const mockQuestions: QuestionData = {
    'test-id': {
      question: 'What is AI?',
      raw_answer: 'AI is artificial intelligence',
      answer_template: 'template'
    }
  };

  it('renders upload button when expanded', async () => {
    render(<RubricTraitGenerator questions={mockQuestions} />);
    
    // Expand the component
    const expandButton = screen.getByText('Rubric Trait Generator');
    fireEvent.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText('Upload')).toBeInTheDocument();
    });
  });

  it('shows file input with correct attributes', async () => {
    render(<RubricTraitGenerator questions={mockQuestions} />);
    
    // Expand the component
    const expandButton = screen.getByText('Rubric Trait Generator');
    fireEvent.click(expandButton);

    await waitFor(() => {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
      expect(fileInput.accept).toBe('.txt,.md');
      expect(fileInput.className).toContain('hidden');
    });
  });

  it('upload button has correct styling and title', async () => {
    render(<RubricTraitGenerator questions={mockQuestions} />);
    
    // Expand the component
    const expandButton = screen.getByText('Rubric Trait Generator');
    fireEvent.click(expandButton);

    await waitFor(() => {
      const uploadLabel = screen.getByTitle('Upload system prompt from file');
      expect(uploadLabel).toBeInTheDocument();
      expect(uploadLabel.className).toContain('bg-green-600');
      expect(uploadLabel.className).toContain('cursor-pointer');
    });
  });

  it('processes text file upload correctly', async () => {
    render(<RubricTraitGenerator questions={mockQuestions} />);
    
    // Expand the component
    const expandButton = screen.getByText('Rubric Trait Generator');
    fireEvent.click(expandButton);

    await waitFor(() => {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Create a mock file
      const file = new File(['Custom system prompt content'], 'test.txt', { type: 'text/plain' });
      
      // Mock FileReader
      const mockFileReader = {
        readAsText: vi.fn(),
        result: 'Custom system prompt content',
        onload: null as ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null
      };
      
      global.FileReader = vi.fn(() => mockFileReader) as unknown as typeof FileReader;
      
      // Trigger file change
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      // Simulate FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload!({ target: { result: 'Custom system prompt content' } } as ProgressEvent<FileReader>);
      }

      expect(mockFileReader.readAsText).toHaveBeenCalledWith(file);
    });
  });

  it('shows validation error for invalid file types', async () => {
    // Mock alert
    window.alert = vi.fn();
    
    render(<RubricTraitGenerator questions={mockQuestions} />);
    
    // Expand the component
    const expandButton = screen.getByText('Rubric Trait Generator');
    fireEvent.click(expandButton);

    await waitFor(() => {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Create a mock invalid file
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      
      // Trigger file change
      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(window.alert).toHaveBeenCalledWith('Please upload a text file (.txt or .md)');
    });
  });
});