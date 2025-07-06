import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RubricResultsDisplay } from '../RubricResultsDisplay';
import { Rubric } from '../../types';

describe('RubricResultsDisplay', () => {
  // Mock rubric data
  const mockRubric: Rubric = {
    traits: [
      {
        name: 'Accuracy',
        kind: 'boolean',
        description: 'Answer is factually correct',
      },
      {
        name: 'Clarity',
        kind: 'score',
        min_score: 1,
        max_score: 5,
        description: 'Response is clear and understandable',
      },
      {
        name: 'Completeness',
        kind: 'score',
        min_score: 1,
        max_score: 5,
        description: 'Response fully addresses the question',
      },
    ],
  };

  describe('when rubricResults is undefined', () => {
    it('displays no rubric evaluation message', () => {
      render(<RubricResultsDisplay rubricResults={undefined} />);

      expect(screen.getByText('No rubric evaluation performed')).toBeInTheDocument();
    });
  });

  describe('when rubricResults is empty', () => {
    it('displays no rubric traits message', () => {
      render(<RubricResultsDisplay rubricResults={{}} />);

      expect(screen.getByText('No rubric traits evaluated')).toBeInTheDocument();
    });
  });

  describe('with boolean traits', () => {
    const booleanResults = {
      Accuracy: true,
      Relevance: false,
      Clarity: true,
    };

    it('displays boolean traits correctly', () => {
      render(<RubricResultsDisplay rubricResults={booleanResults} />);

      expect(screen.getByText('Accuracy')).toBeInTheDocument();
      expect(screen.getByText('Relevance')).toBeInTheDocument();
      expect(screen.getByText('Clarity')).toBeInTheDocument();

      // Check Yes/No values
      const yesTexts = screen.getAllByText('Yes');
      const noTexts = screen.getAllByText('No');
      expect(yesTexts).toHaveLength(2); // Accuracy and Clarity
      expect(noTexts).toHaveLength(1); // Relevance
    });

    it('displays correct pass/fail summary', () => {
      render(<RubricResultsDisplay rubricResults={booleanResults} />);

      expect(screen.getByText('2/3 passed')).toBeInTheDocument();
    });

    it('applies correct styling for passed results', () => {
      render(<RubricResultsDisplay rubricResults={booleanResults} />);

      const summaryBadge = screen.getByText('2/3 passed');
      expect(summaryBadge).toHaveClass('bg-green-100', 'text-green-800');
    });
  });

  describe('with score traits', () => {
    const scoreResults = {
      Quality: 4,
      Depth: 2,
      Style: 5,
    };

    it('displays score traits correctly', () => {
      render(<RubricResultsDisplay rubricResults={scoreResults} />);

      expect(screen.getByText('Quality')).toBeInTheDocument();
      expect(screen.getByText('Depth')).toBeInTheDocument();
      expect(screen.getByText('Style')).toBeInTheDocument();

      // Check score values
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('applies correct styling for passed vs failed scores', () => {
      render(<RubricResultsDisplay rubricResults={scoreResults} />);

      // Quality (4) and Style (5) should be green (>= 3)
      const qualityScore = screen.getByText('4');
      const styleScore = screen.getByText('5');
      expect(qualityScore).toHaveClass('text-green-600');
      expect(styleScore).toHaveClass('text-green-600');

      // Depth (2) should be red (< 3)
      const depthScore = screen.getByText('2');
      expect(depthScore).toHaveClass('text-red-600');
    });

    it('displays correct pass/fail summary for scores', () => {
      render(<RubricResultsDisplay rubricResults={scoreResults} />);

      // Quality (4) and Style (5) pass, Depth (2) fails
      expect(screen.getByText('2/3 passed')).toBeInTheDocument();
    });
  });

  describe('with mixed trait types', () => {
    const mixedResults = {
      Accuracy: true,
      Quality: 4,
      Relevance: false,
      Depth: 2,
    };

    it('displays mixed traits correctly', () => {
      render(<RubricResultsDisplay rubricResults={mixedResults} />);

      expect(screen.getByText('Accuracy')).toBeInTheDocument();
      expect(screen.getByText('Quality')).toBeInTheDocument();
      expect(screen.getByText('Relevance')).toBeInTheDocument();
      expect(screen.getByText('Depth')).toBeInTheDocument();

      expect(screen.getByText('Yes')).toBeInTheDocument(); // Accuracy
      expect(screen.getByText('4')).toBeInTheDocument(); // Quality
      expect(screen.getByText('No')).toBeInTheDocument(); // Relevance
      expect(screen.getByText('2')).toBeInTheDocument(); // Depth
    });

    it('calculates summary correctly for mixed types', () => {
      render(<RubricResultsDisplay rubricResults={mixedResults} />);

      // Accuracy (true) and Quality (4) pass, Relevance (false) and Depth (2) fail
      expect(screen.getByText('2/4 passed')).toBeInTheDocument();
    });
  });

  describe('with trait descriptions', () => {
    const resultsWithDescriptions = {
      Accuracy: true,
      Clarity: 4,
    };

    it('displays trait descriptions when rubric is provided', () => {
      render(<RubricResultsDisplay rubricResults={resultsWithDescriptions} currentRubric={mockRubric} />);

      expect(screen.getByText('Answer is factually correct')).toBeInTheDocument();
      expect(screen.getByText('Response is clear and understandable')).toBeInTheDocument();
    });

    it('does not display descriptions when rubric is not provided', () => {
      render(<RubricResultsDisplay rubricResults={resultsWithDescriptions} />);

      expect(screen.queryByText('Answer is factually correct')).not.toBeInTheDocument();
      expect(screen.queryByText('Response is clear and understandable')).not.toBeInTheDocument();
    });

    it('prioritizes evaluationRubric over currentRubric for descriptions', () => {
      const evaluationRubric: Rubric = {
        traits: [
          {
            name: 'Accuracy',
            kind: 'boolean',
            description: 'Question-specific accuracy description',
          },
          {
            name: 'Clarity',
            kind: 'score',
            min_score: 1,
            max_score: 5,
            description: 'Question-specific clarity description',
          },
        ],
      };

      render(
        <RubricResultsDisplay
          rubricResults={resultsWithDescriptions}
          currentRubric={mockRubric}
          evaluationRubric={evaluationRubric}
        />
      );

      // Should display descriptions from evaluationRubric, not currentRubric
      expect(screen.getByText('Question-specific accuracy description')).toBeInTheDocument();
      expect(screen.getByText('Question-specific clarity description')).toBeInTheDocument();

      // Should not display original descriptions
      expect(screen.queryByText('Answer is factually correct')).not.toBeInTheDocument();
      expect(screen.queryByText('Response is clear and understandable')).not.toBeInTheDocument();
    });
  });

  describe('with edge cases', () => {
    it('handles null/undefined values gracefully', () => {
      const resultsWithNulls = {
        Valid: true,
        Invalid: null,
        Undefined: undefined,
        Zero: 0,
      };

      render(<RubricResultsDisplay rubricResults={resultsWithNulls} />);

      expect(screen.getByText('Valid')).toBeInTheDocument();
      expect(screen.getByText('Invalid')).toBeInTheDocument();
      expect(screen.getByText('Undefined')).toBeInTheDocument();
      expect(screen.getByText('Zero')).toBeInTheDocument();

      // Should show N/A for null/undefined/zero (all falsy values)
      expect(screen.getAllByText('N/A')).toHaveLength(3);
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('applies failed styling when less than 50% traits pass', () => {
      const failedResults = {
        Pass1: true,
        Fail1: false,
        Fail2: false,
        Fail3: 1,
      };

      render(<RubricResultsDisplay rubricResults={failedResults} />);

      const summaryBadge = screen.getByText('1/4 passed');
      expect(summaryBadge).toHaveClass('bg-red-100', 'text-red-800');
    });
  });

  describe('with question-specific trait indicators', () => {
    const mixedResults = {
      GlobalTrait: true,
      QuestionSpecificTrait: 4,
    };

    it('displays question-specific indicators correctly', () => {
      const globalRubric: Rubric = {
        traits: [
          {
            name: 'GlobalTrait',
            kind: 'boolean',
            description: 'This is a global trait',
          },
        ],
      };

      const evaluationRubric: Rubric = {
        traits: [
          {
            name: 'GlobalTrait',
            kind: 'boolean',
            description: 'This is a global trait',
          },
          {
            name: 'QuestionSpecificTrait',
            kind: 'score',
            min_score: 1,
            max_score: 5,
            description: 'This is a question-specific trait',
          },
        ],
      };

      render(
        <RubricResultsDisplay
          rubricResults={mixedResults}
          currentRubric={globalRubric}
          evaluationRubric={evaluationRubric}
        />
      );

      // Global trait should not have Q-specific indicator
      expect(screen.getByText('GlobalTrait')).toBeInTheDocument();

      // Question-specific trait should have Q-specific indicator
      expect(screen.getByText('QuestionSpecificTrait')).toBeInTheDocument();
      expect(screen.getByText('Q-specific')).toBeInTheDocument();

      // Should display both descriptions
      expect(screen.getByText('This is a global trait')).toBeInTheDocument();
      expect(screen.getByText('This is a question-specific trait')).toBeInTheDocument();
    });

    it('handles case where no global rubric is provided', () => {
      const evaluationRubric: Rubric = {
        traits: [
          {
            name: 'SomeTrait',
            kind: 'boolean',
            description: 'A trait description',
          },
        ],
      };

      render(<RubricResultsDisplay rubricResults={{ SomeTrait: true }} evaluationRubric={evaluationRubric} />);

      expect(screen.getByText('SomeTrait')).toBeInTheDocument();
      expect(screen.getByText('A trait description')).toBeInTheDocument();
      // Should not show Q-specific indicator when no global rubric to compare against
      expect(screen.queryByText('Q-specific')).not.toBeInTheDocument();
    });
  });

  describe('styling and layout', () => {
    it('applies custom className when provided', () => {
      const { container } = render(<RubricResultsDisplay rubricResults={{ Test: true }} className="custom-class" />);

      const displayElement = container.firstChild;
      expect(displayElement).toHaveClass('custom-class');
    });

    it('has correct default styling classes', () => {
      const { container } = render(<RubricResultsDisplay rubricResults={{ Test: true }} />);

      const displayElement = container.firstChild;
      expect(displayElement).toHaveClass('bg-slate-50', 'dark:bg-slate-700', 'rounded-lg', 'p-4');
    });

    it('displays header with correct text', () => {
      render(<RubricResultsDisplay rubricResults={{ Test: true }} />);

      expect(screen.getByText('Rubric Evaluation Results')).toBeInTheDocument();
    });
  });
});
