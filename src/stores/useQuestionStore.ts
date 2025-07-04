import { create } from 'zustand';
import { QuestionData, Checkpoint, LegacyCheckpoint, Rubric } from '../types';

// Define the question store state interface
interface QuestionState {
  // Core state
  questionData: QuestionData;
  checkpoint: Checkpoint;
  selectedQuestionId: string;
  currentTemplate: string;
  dataSource: 'default' | 'uploaded';
  
  // Actions
  setQuestionData: (data: QuestionData) => void;
  setCheckpoint: (checkpoint: Checkpoint) => void;
  setSelectedQuestionId: (id: string) => void;
  setCurrentTemplate: (template: string) => void;
  setDataSource: (source: 'default' | 'uploaded') => void;
  
  // Complex operations
  loadQuestionData: (data: QuestionData) => void;
  loadCheckpoint: (checkpoint: Checkpoint | LegacyCheckpoint) => void;
  saveCurrentTemplate: () => void;
  toggleFinished: () => void;
  navigateToQuestion: (questionId: string) => void;
  resetQuestionState: () => void;
  
  // Question rubric management
  getQuestionRubric: (questionId: string) => Rubric | null;
  setQuestionRubric: (questionId: string, rubric: Rubric) => void;
  clearQuestionRubric: (questionId: string) => void;
  
  // Computed getters
  getQuestionIds: () => string[];
  getCurrentIndex: () => number;
  getSelectedQuestion: () => QuestionData[string] | null;
  getCheckpointItem: () => Checkpoint[string] | null;
  getIsModified: () => boolean;
  getOriginalCode: () => string;
  getSavedCode: () => string;
}

// Helper function to detect if checkpoint is legacy format
const isLegacyCheckpoint = (checkpoint: unknown): checkpoint is LegacyCheckpoint => {
  const firstItem = Object.values(checkpoint as Record<string, unknown>)[0] as Record<string, unknown>;
  return firstItem && !firstItem.question && !firstItem.raw_answer;
};

// Helper function to convert legacy checkpoint to new format
const convertLegacyCheckpoint = (legacyCheckpoint: LegacyCheckpoint, questionData: QuestionData): Checkpoint => {
  const newCheckpoint: Checkpoint = {};
  
  Object.entries(legacyCheckpoint).forEach(([questionId, legacyItem]) => {
    const originalQuestion = questionData[questionId];
    if (originalQuestion) {
      newCheckpoint[questionId] = {
        question: originalQuestion.question,
        raw_answer: originalQuestion.raw_answer,
        original_answer_template: originalQuestion.answer_template,
        answer_template: legacyItem.answer_template,
        last_modified: legacyItem.last_modified,
        finished: legacyItem.finished,
        question_rubric: undefined
      };
    }
  });
  
  return newCheckpoint;
};

// Create the store
export const useQuestionStore = create<QuestionState>((set, get) => ({
  // Initial state
  questionData: {},
  checkpoint: {},
  selectedQuestionId: '',
  currentTemplate: '',
  dataSource: 'default',
  
  // Basic setters
  setQuestionData: (questionData: QuestionData) => set(() => ({ questionData })),
  setCheckpoint: (checkpoint: Checkpoint) => set(() => ({ checkpoint })),
  setSelectedQuestionId: (selectedQuestionId: string) => set(() => ({ selectedQuestionId })),
  setCurrentTemplate: (currentTemplate: string) => set(() => ({ currentTemplate })),
  setDataSource: (dataSource: 'default' | 'uploaded') => set(() => ({ dataSource })),
  
  // Complex operations
  loadQuestionData: (data: QuestionData) => {
    const state = get();
    
    // Validation - same as original logic
    const firstQuestionId = Object.keys(data)[0];
    if (firstQuestionId && data[firstQuestionId].answer_template) {
      const isGenericTemplate = data[firstQuestionId].answer_template.includes("Answer to the question:");
      if (isGenericTemplate) {
        console.error("❌ ERROR: Detected placeholder templates! This should not happen.");
        alert("Error: The loaded data contains placeholder templates. Please use the Template Generator to create proper templates.");
        return;
      } else {
        console.log("✅ Loading questions with GENERATED templates (specific descriptions)");
      }
    } else {
      console.error("❌ ERROR: Questions don't have answer templates!");
      alert("Error: These questions don't have answer templates. Please use the Template Generator first.");
      return;
    }
    
    set(() => ({ 
      questionData: data, 
      dataSource: 'uploaded' 
    }));
    
    // Check if we have a checkpoint that matches this question data
    const checkpointQuestionIds = Object.keys(state.checkpoint);
    const dataQuestionIds = Object.keys(data);
    const matchingIds = checkpointQuestionIds.filter(id => dataQuestionIds.includes(id));
    
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
          currentTemplate: checkpointItem?.answer_template || data[firstQuestionId]?.answer_template || ''
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
        };
      });
      
      set(() => ({ checkpoint: freshCheckpoint }));
      console.log(`📝 Created fresh checkpoint with ${Object.keys(freshCheckpoint).length} questions`);
      
      // Select first question if available
      const firstQuestionId = dataQuestionIds[0];
      if (firstQuestionId) {
        set(() => ({ 
          selectedQuestionId: firstQuestionId,
          currentTemplate: data[firstQuestionId]?.answer_template || ''
        }));
      }
    }
  },
  
  loadCheckpoint: (loadedCheckpoint: Checkpoint | LegacyCheckpoint) => {
    const state = get();
    
    console.log('🔄 Loading checkpoint...', { 
      isLegacy: isLegacyCheckpoint(loadedCheckpoint),
      itemCount: Object.keys(loadedCheckpoint).length,
      currentQuestionDataCount: Object.keys(state.questionData).length
    });
    
    // Check if this is a new self-contained checkpoint
    if (!isLegacyCheckpoint(loadedCheckpoint)) {
      const newCheckpoint = loadedCheckpoint as Checkpoint;
      
      // Extract question data from checkpoint
      const restoredQuestionData: QuestionData = {};
      Object.entries(newCheckpoint).forEach(([questionId, checkpointItem]) => {
        restoredQuestionData[questionId] = {
          question: checkpointItem.question,
          raw_answer: checkpointItem.raw_answer,
          answer_template: checkpointItem.original_answer_template
        };
      });
      
      // Set all the state in the correct order
      set(() => ({
        checkpoint: newCheckpoint,
        questionData: restoredQuestionData,
        dataSource: 'uploaded'
      }));
      
      // Select first question and load its current template
      const firstQuestionId = Object.keys(newCheckpoint)[0];
      if (firstQuestionId) {
        set(() => ({
          selectedQuestionId: firstQuestionId,
          currentTemplate: newCheckpoint[firstQuestionId].answer_template
        }));
      }
      
      console.log(`✅ Self-contained checkpoint loaded with ${Object.keys(newCheckpoint).length} questions!`);
      return;
    }
    
    // Legacy format - needs question data
    const legacyCheckpoint = loadedCheckpoint as LegacyCheckpoint;
    const questionIds = Object.keys(state.questionData);
    const checkpointIds = Object.keys(legacyCheckpoint);
    
    if (questionIds.length > 0) {
      // Convert legacy checkpoint using existing question data
      const convertedCheckpoint = convertLegacyCheckpoint(legacyCheckpoint, state.questionData);
      set(() => ({ checkpoint: convertedCheckpoint }));
      
      const matchingIds = checkpointIds.filter(id => questionIds.includes(id));
      console.log(`✅ Legacy checkpoint converted and synced with ${matchingIds.length} loaded questions!`);
      
      // Select first matching question
      if (matchingIds.length > 0) {
        const firstMatchingId = matchingIds[0];
        set(() => ({
          selectedQuestionId: firstMatchingId,
          currentTemplate: convertedCheckpoint[firstMatchingId].answer_template
        }));
      }
    } else {
      // No question data available
      console.warn('⚠️ Legacy checkpoint loaded but no question data available');
      const emptyCheckpoint: Checkpoint = {};
      Object.entries(legacyCheckpoint).forEach(([questionId, legacyItem]) => {
        emptyCheckpoint[questionId] = {
          question: '',
          raw_answer: '',
          original_answer_template: '',
          answer_template: legacyItem.answer_template,
          last_modified: legacyItem.last_modified,
          finished: legacyItem.finished,
          question_rubric: undefined
        };
      });
      set(() => ({ checkpoint: emptyCheckpoint }));
    }
  },
  
  saveCurrentTemplate: () => {
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
        answer_template: isCurrentQuestion ? state.currentTemplate : (existingCheckpointItem?.answer_template || question.answer_template),
        last_modified: isCurrentQuestion ? now : (existingCheckpointItem?.last_modified || now),
        finished: existingCheckpointItem?.finished || false,
        question_rubric: existingCheckpointItem?.question_rubric,
      };
    });

    set(() => ({ checkpoint: completeCheckpoint }));
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
        last_modified: isCurrentQuestion ? now : (existingCheckpointItem?.last_modified || now),
        finished: isCurrentQuestion ? !(existingCheckpointItem?.finished || false) : (existingCheckpointItem?.finished || false),
        question_rubric: existingCheckpointItem?.question_rubric,
      };
    });

    set(() => ({ checkpoint: completeCheckpoint }));
  },
  
  navigateToQuestion: (questionId: string) => {
    const state = get();
    const checkpointItem = state.checkpoint[questionId];
    
    set(() => ({ 
      selectedQuestionId: questionId,
      currentTemplate: checkpointItem?.answer_template || state.questionData[questionId]?.answer_template || ''
    }));
  },
  
  resetQuestionState: () => {
    set(() => ({
      questionData: {},
      checkpoint: {},
      selectedQuestionId: '',
      currentTemplate: '',
      dataSource: 'default'
    }));
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
    
    return selectedQuestion && checkpointItem && 
      checkpointItem.answer_template !== checkpointItem.original_answer_template;
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
          last_modified: new Date().toISOString()
        }
      };
      
      set(() => ({ checkpoint: updatedCheckpoint }));
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
          last_modified: new Date().toISOString()
        }
      };
      
      set(() => ({ checkpoint: updatedCheckpoint }));
    }
  },
}));