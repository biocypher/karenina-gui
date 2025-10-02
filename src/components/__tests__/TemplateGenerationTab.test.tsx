import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test-utils/test-helpers';
import { TemplateGenerationTab } from '../TemplateGenerationTab';

interface QuestionExtractorProps {
  onQuestionsExtracted: (questions: Record<string, unknown>) => void;
  extractedQuestions?: Record<string, unknown>;
}

interface AnswerTemplateGeneratorProps {
  questions: Record<string, unknown>;
  onTemplatesGenerated: (data: Record<string, unknown>) => void;
  onSwitchToCurator?: () => void;
}

// Mock child components
vi.mock('../QuestionExtractor', () => ({
  QuestionExtractor: ({ onQuestionsExtracted, extractedQuestions }: QuestionExtractorProps) => (
    <div>
      <div>Mocked QuestionExtractor</div>
      <div>Extracted: {Object.keys(extractedQuestions || {}).length}</div>
      <button onClick={() => onQuestionsExtracted({ q1: { question: 'Test?', raw_answer: 'Test answer' } })}>
        Extract Questions
      </button>
    </div>
  ),
}));

vi.mock('../AnswerTemplateGenerator', () => ({
  AnswerTemplateGenerator: ({ questions, onTemplatesGenerated, onSwitchToCurator }: AnswerTemplateGeneratorProps) => (
    <div>
      <div>Mocked AnswerTemplateGenerator</div>
      <div>Questions: {Object.keys(questions || {}).length}</div>
      <button
        onClick={() =>
          onTemplatesGenerated({
            q1: { question: 'Test?', raw_answer: 'Test answer', answer_template: 'class Test:\n  pass' },
          })
        }
      >
        Generate Templates
      </button>
      <button onClick={() => onSwitchToCurator && onSwitchToCurator()}>Switch to Curator</button>
    </div>
  ),
}));

describe('TemplateGenerationTab', () => {
  it('should render both question extraction and template generation sections', () => {
    const mockOnTemplatesGenerated = vi.fn();
    const mockOnSwitchToCurator = vi.fn();

    render(
      <TemplateGenerationTab
        onTemplatesGenerated={mockOnTemplatesGenerated}
        onSwitchToCurator={mockOnSwitchToCurator}
      />
    );

    // Check that both sections are rendered
    expect(screen.getByText('1. Question Extraction')).toBeInTheDocument();
    expect(screen.getByText('2. Answer Template Generation')).toBeInTheDocument();
    expect(screen.getByText('Mocked QuestionExtractor')).toBeInTheDocument();
    expect(screen.getByText('Mocked AnswerTemplateGenerator')).toBeInTheDocument();
  });

  it('should display section descriptions', () => {
    const mockOnTemplatesGenerated = vi.fn();

    render(<TemplateGenerationTab onTemplatesGenerated={mockOnTemplatesGenerated} />);

    expect(screen.getByText(/Upload a file and extract questions/)).toBeInTheDocument();
    expect(screen.getByText(/Generate answer templates from extracted questions/)).toBeInTheDocument();
  });

  it('should display visual separator between sections', () => {
    const mockOnTemplatesGenerated = vi.fn();

    render(<TemplateGenerationTab onTemplatesGenerated={mockOnTemplatesGenerated} />);

    expect(screen.getByText(/Extracted questions automatically available below/)).toBeInTheDocument();
  });

  it('should pass extracted questions from QuestionExtractor to AnswerTemplateGenerator', async () => {
    const mockOnTemplatesGenerated = vi.fn();

    render(<TemplateGenerationTab onTemplatesGenerated={mockOnTemplatesGenerated} />);

    // Initially, AnswerTemplateGenerator should have 0 questions
    expect(screen.getByText('Questions: 0')).toBeInTheDocument();

    // Extract questions
    const extractButton = screen.getByText('Extract Questions');
    extractButton.click();

    // Wait for the state update to be reflected in the UI
    expect(await screen.findByText('Questions: 1')).toBeInTheDocument();
  });

  it('should call onTemplatesGenerated when templates are generated', () => {
    const mockOnTemplatesGenerated = vi.fn();

    render(<TemplateGenerationTab onTemplatesGenerated={mockOnTemplatesGenerated} />);

    const generateButton = screen.getByText('Generate Templates');
    generateButton.click();

    expect(mockOnTemplatesGenerated).toHaveBeenCalledWith({
      q1: { question: 'Test?', raw_answer: 'Test answer', answer_template: 'class Test:\n  pass' },
    });
  });

  it('should call onSwitchToCurator when provided', () => {
    const mockOnTemplatesGenerated = vi.fn();
    const mockOnSwitchToCurator = vi.fn();

    render(
      <TemplateGenerationTab
        onTemplatesGenerated={mockOnTemplatesGenerated}
        onSwitchToCurator={mockOnSwitchToCurator}
      />
    );

    const switchButton = screen.getByText('Switch to Curator');
    switchButton.click();

    expect(mockOnSwitchToCurator).toHaveBeenCalled();
  });

  it('should initialize with empty extracted questions', () => {
    const mockOnTemplatesGenerated = vi.fn();

    render(<TemplateGenerationTab onTemplatesGenerated={mockOnTemplatesGenerated} />);

    expect(screen.getByText('Extracted: 0')).toBeInTheDocument();
  });
});
