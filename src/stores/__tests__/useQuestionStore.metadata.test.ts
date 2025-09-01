import { describe, it, expect, beforeEach } from 'vitest';
import { useQuestionStore } from '../useQuestionStore';
import { QuestionData } from '../../types';

describe('useQuestionStore - Metadata Handling', () => {
  beforeEach(() => {
    // Reset the store before each test
    useQuestionStore.getState().resetQuestionState();
  });

  it('maps metadata from questions to checkpoint items when loading question data', () => {
    const questionData: QuestionData = {
      q1: {
        question: 'What is 2+2?',
        raw_answer: '4',
        answer_template: 'class Answer(BaseModel): result: int',
        metadata: {
          author: {
            '@type': 'Person',
            name: 'John Doe',
            email: 'john@example.com',
            affiliation: 'Example University',
          },
          keywords: ['math', 'arithmetic'],
          url: 'https://example.com/math',
        },
      },
      q2: {
        question: 'What is the capital of France?',
        raw_answer: 'Paris',
        answer_template: 'class Answer(BaseModel): capital: str',
        metadata: {
          author: {
            '@type': 'Person',
            name: 'Jane Smith',
          },
          keywords: ['geography'],
        },
      },
      q3: {
        question: 'What color is the sky?',
        raw_answer: 'Blue',
        answer_template: 'class Answer(BaseModel): color: str',
        // No metadata
      },
    };

    const { loadQuestionData } = useQuestionStore.getState();
    loadQuestionData(questionData);

    const currentCheckpoint = useQuestionStore.getState().checkpoint;

    // Check that metadata is properly mapped for q1
    expect(currentCheckpoint.q1.author).toEqual({
      '@type': 'Person',
      name: 'John Doe',
      email: 'john@example.com',
      affiliation: 'Example University',
    });
    expect(currentCheckpoint.q1.keywords).toEqual(['math', 'arithmetic']);
    expect(currentCheckpoint.q1.custom_metadata).toEqual({ url: 'https://example.com/math' });

    // Check that partial metadata is properly mapped for q2
    expect(currentCheckpoint.q2.author).toEqual({
      '@type': 'Person',
      name: 'Jane Smith',
    });
    expect(currentCheckpoint.q2.keywords).toEqual(['geography']);
    expect(currentCheckpoint.q2.custom_metadata).toBeUndefined();

    // Check that questions without metadata have undefined fields
    expect(currentCheckpoint.q3.author).toBeUndefined();
    expect(currentCheckpoint.q3.keywords).toBeUndefined();
    expect(currentCheckpoint.q3.custom_metadata).toBeUndefined();
  });

  it('preserves existing metadata when updating checkpoint items', () => {
    const questionData: QuestionData = {
      q1: {
        question: 'What is 2+2?',
        raw_answer: '4',
        answer_template: 'class Answer(BaseModel): result: int',
        metadata: {
          author: { '@type': 'Person', name: 'John Doe' },
          keywords: ['math'],
        },
      },
    };

    const { loadQuestionData, saveCurrentTemplate, setCurrentTemplate, setSelectedQuestionId } =
      useQuestionStore.getState();
    loadQuestionData(questionData);

    // Modify the template
    setSelectedQuestionId('q1');
    setCurrentTemplate('class Answer(BaseModel): result: float');
    saveCurrentTemplate();

    const currentCheckpoint = useQuestionStore.getState().checkpoint;

    // Metadata should be preserved after template update
    expect(currentCheckpoint.q1.author).toEqual({ '@type': 'Person', name: 'John Doe' });
    expect(currentCheckpoint.q1.keywords).toEqual(['math']);
    expect(currentCheckpoint.q1.answer_template).toBe('class Answer(BaseModel): result: float');
  });

  it('preserves metadata when toggling finished status', () => {
    const questionData: QuestionData = {
      q1: {
        question: 'What is 2+2?',
        raw_answer: '4',
        answer_template: 'class Answer(BaseModel): result: int',
        metadata: {
          author: { '@type': 'Person', name: 'Jane Smith' },
          url: 'https://example.com',
        },
      },
    };

    const { loadQuestionData, toggleFinished, setSelectedQuestionId } = useQuestionStore.getState();
    loadQuestionData(questionData);
    setSelectedQuestionId('q1');

    toggleFinished();

    const currentCheckpoint = useQuestionStore.getState().checkpoint;

    // Metadata should be preserved after toggling finished
    expect(currentCheckpoint.q1.author).toEqual({ '@type': 'Person', name: 'Jane Smith' });
    expect(currentCheckpoint.q1.custom_metadata).toEqual({ url: 'https://example.com' });
    expect(currentCheckpoint.q1.finished).toBe(true);
  });

  it('handles URL metadata by mapping to custom_metadata field', () => {
    const questionData: QuestionData = {
      q1: {
        question: 'Test question',
        raw_answer: 'Test answer',
        answer_template: 'class Answer(BaseModel): result: str',
        metadata: {
          url: 'https://example.com/source',
        },
      },
      q2: {
        question: 'Test question 2',
        raw_answer: 'Test answer 2',
        answer_template: 'class Answer(BaseModel): result: str',
        metadata: {
          author: { '@type': 'Person', name: 'Test Author' },
          url: 'https://example.com/source2',
        },
      },
    };

    const { loadQuestionData } = useQuestionStore.getState();
    loadQuestionData(questionData);

    const currentCheckpoint = useQuestionStore.getState().checkpoint;

    // URL should be mapped to custom_metadata
    expect(currentCheckpoint.q1.custom_metadata).toEqual({ url: 'https://example.com/source' });
    expect(currentCheckpoint.q2.custom_metadata).toEqual({ url: 'https://example.com/source2' });

    // Other metadata should be preserved
    expect(currentCheckpoint.q2.author).toEqual({ '@type': 'Person', name: 'Test Author' });
  });

  it('handles questions with no metadata gracefully', () => {
    const questionData: QuestionData = {
      q1: {
        question: 'Test question',
        raw_answer: 'Test answer',
        answer_template: 'class Answer(BaseModel): result: str',
        // No metadata field
      },
    };

    const { loadQuestionData } = useQuestionStore.getState();

    // Should not throw
    expect(() => loadQuestionData(questionData)).not.toThrow();

    const currentCheckpoint = useQuestionStore.getState().checkpoint;

    // All metadata fields should be undefined
    expect(currentCheckpoint.q1.author).toBeUndefined();
    expect(currentCheckpoint.q1.keywords).toBeUndefined();
    expect(currentCheckpoint.q1.custom_metadata).toBeUndefined();
  });

  it('preserves existing checkpoint metadata when merging with new question data', () => {
    // First, load some question data
    const initialData: QuestionData = {
      q1: {
        question: 'What is 2+2?',
        raw_answer: '4',
        answer_template: 'class Answer(BaseModel): result: int',
        metadata: {
          author: { '@type': 'Person', name: 'Original Author' },
        },
      },
    };

    const { loadQuestionData, setSelectedQuestionId, setCurrentTemplate, saveCurrentTemplate } =
      useQuestionStore.getState();
    loadQuestionData(initialData);

    // Modify the checkpoint by changing template and adding custom data
    setSelectedQuestionId('q1');
    setCurrentTemplate('class Answer(BaseModel): result: float');
    saveCurrentTemplate();

    // Now load new data that includes the same question with different metadata
    const newData: QuestionData = {
      q1: {
        question: 'What is 2+2?',
        raw_answer: '4',
        answer_template: 'class Answer(BaseModel): result: int', // Back to original template
        metadata: {
          keywords: ['math', 'arithmetic'], // Different metadata
        },
      },
    };

    // This should preserve existing checkpoint data
    loadQuestionData(newData);

    const currentCheckpoint = useQuestionStore.getState().checkpoint;

    // Should preserve the modified template from checkpoint
    expect(currentCheckpoint.q1.answer_template).toBe('class Answer(BaseModel): result: float');

    // Should preserve the original author from existing checkpoint
    expect(currentCheckpoint.q1.author).toEqual({ '@type': 'Person', name: 'Original Author' });

    // Should add the new keywords since they weren't in the original checkpoint
    expect(currentCheckpoint.q1.keywords).toEqual(['math', 'arithmetic']);
  });
});
