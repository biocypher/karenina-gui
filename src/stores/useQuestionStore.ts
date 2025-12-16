import { create } from 'zustand';
import { QuestionData, Checkpoint, UnifiedCheckpoint, Rubric } from '../types';
import { autoSaveToDatabase } from '../utils/databaseAutoSave';
import { useRubricStore } from './useRubricStore';

// Define the question store state interface
interface QuestionState {
  // Core state
  questionData: QuestionData;
  checkpoint: Checkpoint;
  selectedQuestionId: string;
  currentTemplate: string;
  dataSource: 'default' | 'uploaded';
  sessionDrafts: Record<string, string>; // Session-only drafts (cleared on refresh)

  // Actions
  setQuestionData: (data: QuestionData) => void;
  setCheckpoint: (checkpoint: Checkpoint) => void;
  setSelectedQuestionId: (id: string) => void;
  setCurrentTemplate: (template: string) => void;
  setDataSource: (source: 'default' | 'uploaded') => void;
  setSessionDraft: (questionId: string, template: string) => void;
  clearSessionDraft: (questionId: string) => void;
  hasSessionDraft: (questionId: string) => boolean;
  getAllQuestionsWithSessionDrafts: () => string[];

  // Complex operations
  loadQuestionData: (data: QuestionData) => void;
  loadCheckpoint: (unifiedCheckpoint: UnifiedCheckpoint) => void;
  saveCurrentTemplate: () => void;
  toggleFinished: () => void;
  navigateToQuestion: (questionId: string) => void;
  resetQuestionState: () => void;
  addNewQuestion: (
    question: string,
    rawAnswer: string,
    author?: string,
    keywords?: string[],
    generatedTemplate?: string
  ) => string;

  // Question rubric management
  getQuestionRubric: (questionId: string) => Rubric | null;
  setQuestionRubric: (questionId: string, rubric: Rubric) => void;
  clearQuestionRubric: (questionId: string) => void;

  // Question content editing
  updateQuestionContent: (questionId: string, question: string, rawAnswer: string) => void;
  deleteQuestion: (questionId: string) => void;
  cloneQuestion: (questionId: string) => string;

  // Computed getters
  getQuestionIds: () => string[];
  getCurrentIndex: () => number;
  getSelectedQuestion: () => QuestionData[string] | null;
  getCheckpointItem: () => Checkpoint[string] | null;
  getIsModified: () => boolean;
  getOriginalCode: () => string;
  getSavedCode: () => string;
}

// Create the store
export const useQuestionStore = create<QuestionState>((set, get) => ({
  // Initial state
  questionData: {},
  checkpoint: {},
  selectedQuestionId: '',
  currentTemplate: '',
  dataSource: 'default',
  sessionDrafts: {},

  // Basic setters
  setQuestionData: (questionData: QuestionData) => set(() => ({ questionData })),
  setCheckpoint: (checkpoint: Checkpoint) => set(() => ({ checkpoint })),
  setSelectedQuestionId: (selectedQuestionId: string) => set(() => ({ selectedQuestionId })),
  setCurrentTemplate: (currentTemplate: string) => set(() => ({ currentTemplate })),
  setDataSource: (dataSource: 'default' | 'uploaded') => set(() => ({ dataSource })),

  // Session draft management
  setSessionDraft: (questionId: string, template: string) => {
    const state = get();
    set(() => ({
      sessionDrafts: {
        ...state.sessionDrafts,
        [questionId]: template,
      },
    }));
  },

  clearSessionDraft: (questionId: string) => {
    const state = get();
    const remainingDrafts = Object.fromEntries(
      Object.entries(state.sessionDrafts).filter(([key]) => key !== questionId)
    );
    set(() => ({ sessionDrafts: remainingDrafts }));
  },

  hasSessionDraft: (questionId: string) => {
    const state = get();
    return questionId in state.sessionDrafts;
  },

  getAllQuestionsWithSessionDrafts: () => {
    const state = get();
    return Object.keys(state.sessionDrafts);
  },

  // Complex operations
  loadQuestionData: (data: QuestionData) => {
    const state = get();

    // Validation - same as original logic
    const firstQuestionId = Object.keys(data)[0];
    if (firstQuestionId && data[firstQuestionId].answer_template) {
      const isGenericTemplate = data[firstQuestionId].answer_template.includes('Answer to the question:');
      if (isGenericTemplate) {
        console.error('❌ ERROR: Detected placeholder templates! This should not happen.');
        alert(
          'Error: The loaded data contains placeholder templates. Please use the Template Generator to create proper templates.'
        );
        return;
      } else {
        console.log('✅ Loading questions with GENERATED templates (specific descriptions)');
      }
    } else {
      console.error("❌ ERROR: Questions don't have answer templates!");
      alert("Error: These questions don't have answer templates. Please use the Template Generator first.");
      return;
    }

    set(() => ({
      questionData: data,
      dataSource: 'uploaded',
    }));

    // Check if we have a checkpoint that matches this question data
    const checkpointQuestionIds = Object.keys(state.checkpoint);
    const dataQuestionIds = Object.keys(data);
    const matchingIds = checkpointQuestionIds.filter((id) => dataQuestionIds.includes(id));

    if (matchingIds.length > 0) {
      console.log(`✅ Checkpoint matches ${matchingIds.length} questions - your progress will be restored!`);

      // Create a complete checkpoint with ALL questions
      const completeCheckpoint: Checkpoint = {};

      Object.entries(data).forEach(([questionId, question]) => {
        const existingCheckpointItem = state.checkpoint[questionId];

        completeCheckpoint[questionId] = {
          question: question.question,
          raw_answer: question.raw_answer,
          original_answer_template: question.answer_template,
          answer_template: existingCheckpointItem?.answer_template || question.answer_template,
          last_modified: existingCheckpointItem?.last_modified || new Date().toISOString(),
          finished: existingCheckpointItem?.finished || false,
          question_rubric: existingCheckpointItem?.question_rubric,
          // Map metadata from Question to CheckpointItem (preserve existing checkpoint metadata)
          author: existingCheckpointItem?.author ?? question.metadata?.author,
          keywords: existingCheckpointItem?.keywords ?? question.metadata?.keywords,
          // Map URL to custom metadata (CheckpointItem doesn't have direct url field)
          custom_metadata:
            existingCheckpointItem?.custom_metadata ??
            (question.metadata?.url ? { url: question.metadata.url } : undefined),
        };
      });

      set(() => ({ checkpoint: completeCheckpoint }));
      console.log(`📝 Created complete checkpoint with ${Object.keys(completeCheckpoint).length} questions`);

      // Select the first question that has checkpoint data
      const firstCheckpointId = matchingIds[0];
      const firstQuestionId = firstCheckpointId || dataQuestionIds[0];

      if (firstQuestionId) {
        const checkpointItem = completeCheckpoint[firstQuestionId];
        set(() => ({
          selectedQuestionId: firstQuestionId,
          currentTemplate: checkpointItem?.answer_template || data[firstQuestionId]?.answer_template || '',
        }));
      }
    } else {
      // No checkpoint matches - create a fresh complete checkpoint
      const freshCheckpoint: Checkpoint = {};
      const now = new Date().toISOString();

      Object.entries(data).forEach(([questionId, question]) => {
        freshCheckpoint[questionId] = {
          question: question.question,
          raw_answer: question.raw_answer,
          original_answer_template: question.answer_template,
          answer_template: question.answer_template,
          last_modified: now,
          finished: false,
          question_rubric: undefined,
          // Map metadata from Question to CheckpointItem
          author: question.metadata?.author,
          keywords: question.metadata?.keywords,
          // Map URL to custom metadata (CheckpointItem doesn't have direct url field)
          custom_metadata: question.metadata?.url ? { url: question.metadata.url } : undefined,
        };
      });

      set(() => ({ checkpoint: freshCheckpoint }));
      console.log(`📝 Created fresh checkpoint with ${Object.keys(freshCheckpoint).length} questions`);

      // Select first question if available
      const firstQuestionId = dataQuestionIds[0];
      if (firstQuestionId) {
        set(() => ({
          selectedQuestionId: firstQuestionId,
          currentTemplate: data[firstQuestionId]?.answer_template || '',
        }));
      }
    }
  },

  loadCheckpoint: (unifiedCheckpoint: UnifiedCheckpoint) => {
    console.log('🔄 Loading unified checkpoint...', {
      version: unifiedCheckpoint.version,
      itemCount: Object.keys(unifiedCheckpoint.checkpoint).length,
      hasGlobalRubric: !!unifiedCheckpoint.global_rubric,
    });

    // Extract checkpoint data
    const checkpoint = unifiedCheckpoint.checkpoint;

    // Extract question data from checkpoint
    const restoredQuestionData: QuestionData = {};
    Object.entries(checkpoint).forEach(([questionId, checkpointItem]) => {
      restoredQuestionData[questionId] = {
        question: checkpointItem.question,
        raw_answer: checkpointItem.raw_answer,
        answer_template: checkpointItem.original_answer_template,
      };
    });

    // Set all the state in the correct order
    set(() => ({
      checkpoint: checkpoint,
      questionData: restoredQuestionData,
      dataSource: 'uploaded',
    }));

    // Select first question and load its current template
    const firstQuestionId = Object.keys(checkpoint)[0];
    if (firstQuestionId) {
      set(() => ({
        selectedQuestionId: firstQuestionId,
        currentTemplate: checkpoint[firstQuestionId].answer_template,
      }));
    }

    // Load global rubric if present
    if (unifiedCheckpoint.global_rubric) {
      console.log('🔄 Setting global rubric from checkpoint...', {
        llm_traits: unifiedCheckpoint.global_rubric.llm_traits?.length ?? 0,
        regex_traits: unifiedCheckpoint.global_rubric.regex_traits?.length ?? 0,
        metric_traits: unifiedCheckpoint.global_rubric.metric_traits?.length ?? 0,
      });
      useRubricStore.getState().setCurrentRubric(unifiedCheckpoint.global_rubric);
    }

    console.log(`✅ Unified checkpoint loaded with ${Object.keys(checkpoint).length} questions!`);
  },

  saveCurrentTemplate: () => {
    const state = get();

    // Debug logging to understand save flow
    console.log('💾 saveCurrentTemplate called', {
      selectedQuestionId: state.selectedQuestionId,
      hasQuestionData: !!state.questionData[state.selectedQuestionId],
      totalQuestions: Object.keys(state.questionData).length,
      totalCheckpointItems: Object.keys(state.checkpoint).length,
    });

    if (!state.selectedQuestionId || !state.questionData[state.selectedQuestionId]) {
      console.error('❌ saveCurrentTemplate: Early return - missing selectedQuestionId or questionData', {
        selectedQuestionId: state.selectedQuestionId,
        hasQuestionInData: !!state.questionData[state.selectedQuestionId],
      });
      return;
    }

    const now = new Date().toISOString();

    // Create a complete checkpoint with ALL questions
    const completeCheckpoint: Checkpoint = {};

    Object.entries(state.questionData).forEach(([questionId, question]) => {
      const existingCheckpointItem = state.checkpoint[questionId];
      const isCurrentQuestion = questionId === state.selectedQuestionId;

      completeCheckpoint[questionId] = {
        question: question.question,
        raw_answer: question.raw_answer,
        original_answer_template: question.answer_template,
        answer_template: isCurrentQuestion
          ? state.currentTemplate
          : existingCheckpointItem?.answer_template || question.answer_template,
        last_modified: isCurrentQuestion ? now : existingCheckpointItem?.last_modified || now,
        finished: existingCheckpointItem?.finished || false,
        question_rubric: existingCheckpointItem?.question_rubric,
        // Preserve few-shot examples from existing checkpoint
        few_shot_examples: existingCheckpointItem?.few_shot_examples,
        // Preserve metadata from existing checkpoint or map from Question
        author: existingCheckpointItem?.author ?? question.metadata?.author,
        keywords: existingCheckpointItem?.keywords ?? question.metadata?.keywords,
        custom_metadata:
          existingCheckpointItem?.custom_metadata ??
          (question.metadata?.url ? { url: question.metadata.url } : undefined),
      };
    });

    set(() => ({ checkpoint: completeCheckpoint }));

    console.log('✅ Checkpoint updated in store', {
      totalItems: Object.keys(completeCheckpoint).length,
      currentQuestionId: state.selectedQuestionId,
    });

    // Clear session draft for the saved question (it's now permanently saved)
    const updatedState = get();
    const remainingDrafts = Object.fromEntries(
      Object.entries(updatedState.sessionDrafts).filter(([key]) => key !== state.selectedQuestionId)
    );
    set(() => ({ sessionDrafts: remainingDrafts }));

    // Auto-save to database after saving template
    console.log('🔄 Attempting to save to database...');
    autoSaveToDatabase(completeCheckpoint)
      .then(() => {
        console.log('✅ Successfully saved to database');
      })
      .catch((err) => {
        console.error('❌ Failed to save to database:', err);
        alert(`Failed to save to database: ${err instanceof Error ? err.message : 'Unknown error'}`);
      });
  },

  toggleFinished: () => {
    const state = get();
    if (!state.selectedQuestionId || !state.questionData[state.selectedQuestionId]) return;

    const now = new Date().toISOString();

    // Create a complete checkpoint with ALL questions
    const completeCheckpoint: Checkpoint = {};

    Object.entries(state.questionData).forEach(([questionId, question]) => {
      const existingCheckpointItem = state.checkpoint[questionId];
      const isCurrentQuestion = questionId === state.selectedQuestionId;

      completeCheckpoint[questionId] = {
        question: question.question,
        raw_answer: question.raw_answer,
        original_answer_template: question.answer_template,
        answer_template: existingCheckpointItem?.answer_template || question.answer_template,
        last_modified: isCurrentQuestion ? now : existingCheckpointItem?.last_modified || now,
        finished: isCurrentQuestion
          ? !(existingCheckpointItem?.finished || false)
          : existingCheckpointItem?.finished || false,
        question_rubric: existingCheckpointItem?.question_rubric,
        // Preserve few-shot examples
        few_shot_examples: existingCheckpointItem?.few_shot_examples,
        // Preserve metadata from existing checkpoint or map from Question
        author: existingCheckpointItem?.author ?? question.metadata?.author,
        keywords: existingCheckpointItem?.keywords ?? question.metadata?.keywords,
        custom_metadata:
          existingCheckpointItem?.custom_metadata ??
          (question.metadata?.url ? { url: question.metadata.url } : undefined),
      };
    });

    set(() => ({ checkpoint: completeCheckpoint }));

    // Auto-save to database after toggling finished status
    autoSaveToDatabase(completeCheckpoint).catch((err) => {
      console.warn('⚠️ Failed to auto-save to database after toggle finished:', err);
    });
  },

  navigateToQuestion: (questionId: string) => {
    const state = get();

    // Prefer session draft over checkpoint/question data
    const sessionDraft = state.sessionDrafts[questionId];
    const checkpointItem = state.checkpoint[questionId];

    const templateToLoad =
      sessionDraft || checkpointItem?.answer_template || state.questionData[questionId]?.answer_template || '';

    set(() => ({
      selectedQuestionId: questionId,
      currentTemplate: templateToLoad,
    }));
  },

  resetQuestionState: () => {
    set(() => ({
      questionData: {},
      checkpoint: {},
      selectedQuestionId: '',
      currentTemplate: '',
      dataSource: 'default',
      sessionDrafts: {},
    }));
  },

  addNewQuestion: (
    question: string,
    rawAnswer: string,
    author?: string,
    keywords?: string[],
    generatedTemplate?: string
  ) => {
    const state = get();

    // Generate UUID for the question
    const questionId = crypto.randomUUID();

    // Validate and sanitize keywords
    const validKeywords =
      keywords && Array.isArray(keywords) && keywords.length > 0
        ? keywords.filter((k) => typeof k === 'string' && k.trim().length > 0)
        : undefined;

    // Validate generated template is a non-empty string
    const validGeneratedTemplate =
      typeof generatedTemplate === 'string' && generatedTemplate.trim().length > 0
        ? generatedTemplate.trim()
        : undefined;

    // Generate basic Pydantic template
    const questionPreview = question.length > 50 ? question.substring(0, 50) + '...' : question;
    const basicTemplate = `from karenina.schemas.answer_class import BaseAnswer
from pydantic import Field

class Answer(BaseAnswer):
    """Answer to the question: ${questionPreview}"""
    answer: str = Field(description="The answer to the question")`;

    // Use generated template if provided, otherwise use basic template
    const templateToUse = validGeneratedTemplate || basicTemplate;

    // Log template source for debugging
    if (validGeneratedTemplate) {
      console.log('📝 Using LLM-generated template for new question');
    } else if (generatedTemplate) {
      console.warn('⚠️ LLM template was invalid, falling back to basic template');
    }

    const now = new Date().toISOString();

    // Create new question entry
    const newQuestion: QuestionData[string] = {
      question,
      raw_answer: rawAnswer,
      answer_template: templateToUse,
      ...(author || validKeywords
        ? {
            metadata: {
              ...(author ? { author: { '@type': 'Person' as const, name: author } } : {}),
              ...(validKeywords ? { keywords: validKeywords } : {}),
            },
          }
        : {}),
    };

    // Create checkpoint item
    const newCheckpointItem = {
      question,
      raw_answer: rawAnswer,
      original_answer_template: templateToUse,
      answer_template: templateToUse,
      last_modified: now,
      date_created: now,
      finished: false,
      question_rubric: undefined,
      few_shot_examples: undefined,
      ...(author ? { author: { '@type': 'Person' as const, name: author } } : {}),
      ...(validKeywords && validKeywords.length > 0 ? { keywords: validKeywords } : {}),
    };

    // Update state with new question
    const updatedQuestionData = {
      ...state.questionData,
      [questionId]: newQuestion,
    };

    const updatedCheckpoint = {
      ...state.checkpoint,
      [questionId]: newCheckpointItem,
    };

    set(() => ({
      questionData: updatedQuestionData,
      checkpoint: updatedCheckpoint,
      selectedQuestionId: questionId,
      currentTemplate: templateToUse,
      dataSource: 'uploaded',
    }));

    console.log(`✅ Added new question with ID: ${questionId}`);
    return questionId;
  },

  // Computed getters
  getQuestionIds: () => {
    const state = get();
    return Object.keys(state.questionData);
  },

  getCurrentIndex: () => {
    const state = get();
    const questionIds = Object.keys(state.questionData);
    return questionIds.indexOf(state.selectedQuestionId);
  },

  getSelectedQuestion: () => {
    const state = get();
    return state.selectedQuestionId ? state.questionData[state.selectedQuestionId] : null;
  },

  getCheckpointItem: () => {
    const state = get();
    return state.selectedQuestionId ? state.checkpoint[state.selectedQuestionId] : null;
  },

  getIsModified: () => {
    const state = get();
    const selectedQuestion = state.selectedQuestionId ? state.questionData[state.selectedQuestionId] : null;
    const checkpointItem = state.selectedQuestionId ? state.checkpoint[state.selectedQuestionId] : null;

    return (
      selectedQuestion && checkpointItem && checkpointItem.answer_template !== checkpointItem.original_answer_template
    );
  },

  getOriginalCode: () => {
    const state = get();
    const checkpointItem = state.selectedQuestionId ? state.checkpoint[state.selectedQuestionId] : null;
    const selectedQuestion = state.selectedQuestionId ? state.questionData[state.selectedQuestionId] : null;

    return checkpointItem?.original_answer_template || selectedQuestion?.answer_template || '';
  },

  getSavedCode: () => {
    const state = get();
    const checkpointItem = state.selectedQuestionId ? state.checkpoint[state.selectedQuestionId] : null;

    return checkpointItem?.answer_template || '';
  },

  // Question rubric management
  getQuestionRubric: (questionId: string) => {
    const state = get();
    return state.checkpoint[questionId]?.question_rubric || null;
  },

  setQuestionRubric: (questionId: string, rubric: Rubric) => {
    const state = get();
    const existingCheckpointItem = state.checkpoint[questionId];

    if (existingCheckpointItem) {
      const updatedCheckpoint = {
        ...state.checkpoint,
        [questionId]: {
          ...existingCheckpointItem,
          question_rubric: rubric,
          last_modified: new Date().toISOString(),
        },
      };

      set(() => ({ checkpoint: updatedCheckpoint }));

      // Auto-save to database after updating rubric
      autoSaveToDatabase(updatedCheckpoint).catch((err) => {
        console.warn('⚠️ Failed to auto-save to database after rubric update:', err);
      });
    }
  },

  clearQuestionRubric: (questionId: string) => {
    const state = get();
    const existingCheckpointItem = state.checkpoint[questionId];

    if (existingCheckpointItem) {
      const updatedCheckpoint = {
        ...state.checkpoint,
        [questionId]: {
          ...existingCheckpointItem,
          question_rubric: undefined,
          last_modified: new Date().toISOString(),
        },
      };

      set(() => ({ checkpoint: updatedCheckpoint }));
    }
  },

  // Question content editing
  updateQuestionContent: (questionId: string, question: string, rawAnswer: string) => {
    const state = get();
    const existingQuestion = state.questionData[questionId];
    const existingCheckpointItem = state.checkpoint[questionId];

    if (!existingQuestion || !existingCheckpointItem) {
      console.error('❌ updateQuestionContent: Question not found', { questionId });
      return;
    }

    const now = new Date().toISOString();

    // Update questionData
    const updatedQuestionData = {
      ...state.questionData,
      [questionId]: {
        ...existingQuestion,
        question,
        raw_answer: rawAnswer,
      },
    };

    // Update checkpoint
    const updatedCheckpoint = {
      ...state.checkpoint,
      [questionId]: {
        ...existingCheckpointItem,
        question,
        raw_answer: rawAnswer,
        last_modified: now,
      },
    };

    set(() => ({
      questionData: updatedQuestionData,
      checkpoint: updatedCheckpoint,
    }));

    console.log('✅ Question content updated', { questionId });

    // Auto-save to database
    autoSaveToDatabase(updatedCheckpoint).catch((err) => {
      console.error('❌ Failed to auto-save to database after question update:', err);
      alert(`Failed to save to database: ${err instanceof Error ? err.message : 'Unknown error'}`);
    });
  },

  deleteQuestion: (questionId: string) => {
    const state = get();

    if (!state.questionData[questionId] || !state.checkpoint[questionId]) {
      console.error('❌ deleteQuestion: Question not found', { questionId });
      return;
    }

    // Get question IDs before deletion for navigation
    const questionIds = Object.keys(state.questionData);
    const currentIndex = questionIds.indexOf(questionId);

    // Remove from questionData
    const updatedQuestionData = { ...state.questionData };
    delete updatedQuestionData[questionId];

    // Remove from checkpoint
    const updatedCheckpoint = { ...state.checkpoint };
    delete updatedCheckpoint[questionId];

    // Clear session draft for deleted question
    const remainingDrafts = Object.fromEntries(
      Object.entries(state.sessionDrafts).filter(([key]) => key !== questionId)
    );

    // Determine which question to navigate to
    const remainingIds = Object.keys(updatedQuestionData);
    let newSelectedQuestionId = '';
    let newCurrentTemplate = '';

    if (remainingIds.length > 0) {
      // Navigate to next question, or previous if we deleted the last one
      const newIndex = Math.min(currentIndex, remainingIds.length - 1);
      newSelectedQuestionId = remainingIds[newIndex];
      newCurrentTemplate = updatedCheckpoint[newSelectedQuestionId]?.answer_template || '';
    }

    set(() => ({
      questionData: updatedQuestionData,
      checkpoint: updatedCheckpoint,
      sessionDrafts: remainingDrafts,
      selectedQuestionId: newSelectedQuestionId,
      currentTemplate: newCurrentTemplate,
    }));

    console.log('✅ Question deleted', { questionId, newSelectedQuestionId });

    // Auto-save to database
    autoSaveToDatabase(updatedCheckpoint).catch((err) => {
      console.error('❌ Failed to auto-save to database after question deletion:', err);
      alert(`Failed to save to database: ${err instanceof Error ? err.message : 'Unknown error'}`);
    });
  },

  cloneQuestion: (questionId: string) => {
    const state = get();
    const sourceQuestion = state.questionData[questionId];
    const sourceCheckpointItem = state.checkpoint[questionId];

    if (!sourceQuestion || !sourceCheckpointItem) {
      console.error('❌ cloneQuestion: Source question not found', { questionId });
      return '';
    }

    // Generate new UUID for the cloned question
    const newQuestionId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Clone question text with [CLONED] prefix
    const clonedQuestionText = `[CLONED] ${sourceQuestion.question}`;

    // Create cloned question entry (copy all fields)
    const clonedQuestion: QuestionData[string] = {
      ...sourceQuestion,
      question: clonedQuestionText,
    };

    // Create cloned checkpoint item (copy all fields exactly, update timestamps and finished)
    const clonedCheckpointItem = {
      ...sourceCheckpointItem,
      question: clonedQuestionText,
      date_created: now,
      last_modified: now,
      finished: false, // Clone needs review
    };

    // Insert cloned question immediately after the source question
    // Rebuild objects to maintain correct order
    const questionIds = Object.keys(state.questionData);
    const sourceIndex = questionIds.indexOf(questionId);

    const updatedQuestionData: QuestionData = {};
    const updatedCheckpoint: Checkpoint = {};

    questionIds.forEach((id, index) => {
      // Add existing question
      updatedQuestionData[id] = state.questionData[id];
      updatedCheckpoint[id] = state.checkpoint[id];

      // Insert clone right after source
      if (index === sourceIndex) {
        updatedQuestionData[newQuestionId] = clonedQuestion;
        updatedCheckpoint[newQuestionId] = clonedCheckpointItem;
      }
    });

    set(() => ({
      questionData: updatedQuestionData,
      checkpoint: updatedCheckpoint,
      selectedQuestionId: newQuestionId,
      currentTemplate: clonedCheckpointItem.answer_template,
    }));

    console.log('✅ Question cloned', { sourceId: questionId, newId: newQuestionId, insertedAfterIndex: sourceIndex });

    // Auto-save to database
    autoSaveToDatabase(updatedCheckpoint).catch((err) => {
      console.error('❌ Failed to auto-save to database after question clone:', err);
      alert(`Failed to save to database: ${err instanceof Error ? err.message : 'Unknown error'}`);
    });

    return newQuestionId;
  },
}));
