import { create } from 'zustand';
import {
  QuestionData,
  TemplateGenerationConfig,
  TemplateGenerationProgress,
  TemplateGenerationResult,
  GeneratedTemplate,
} from '../types';
import { logger } from '../utils/logger';
import { handleApiError } from '../utils/errorHandler';

// Extraction workflow types
export interface FileInfo {
  file_id: string;
  filename: string;
  size: number;
}

export interface PreviewData {
  success: boolean;
  total_rows?: number;
  columns?: string[];
  preview_rows?: number;
  data?: Record<string, string>[];
  error?: string;
}

export interface MetadataColumnSettings {
  author_name_column?: string;
  author_email_column?: string;
  author_affiliation_column?: string;
  url_column?: string;
  keywords_column?: string;
  keywords_separator: string;
}

// Define the template store state interface
interface TemplateState {
  // Configuration state
  config: TemplateGenerationConfig;

  // Question extraction workflow state (persists across tab switches)
  uploadedFile: FileInfo | null;
  previewData: PreviewData | null;
  selectedQuestionColumn: string;
  selectedAnswerColumn: string;
  selectedSheet: string;
  currentStep: 'upload' | 'preview' | 'configure' | 'extract' | 'visualize';
  advancedVisible: boolean;
  metadataSettings: MetadataColumnSettings;
  extractedQuestions: QuestionData;

  // Selection state
  selectedQuestions: Set<string>;
  hasInitialized: boolean;

  // Generation state
  isGenerating: boolean;
  progress: TemplateGenerationProgress | null;
  result: TemplateGenerationResult | null;
  error: string | null;
  jobId: string | null;

  // WebSocket state
  websocket: WebSocket | null;

  // Generated templates state (ephemeral - not persisted)
  generatedTemplates: Record<string, GeneratedTemplate>;

  // Actions
  setConfig: (config: TemplateGenerationConfig) => void;

  // Extraction workflow actions
  setUploadedFile: (file: FileInfo | null) => void;
  setPreviewData: (data: PreviewData | null) => void;
  setSelectedQuestionColumn: (column: string) => void;
  setSelectedAnswerColumn: (column: string) => void;
  setSelectedSheet: (sheet: string) => void;
  setCurrentStep: (step: 'upload' | 'preview' | 'configure' | 'extract' | 'visualize') => void;
  setAdvancedVisible: (visible: boolean) => void;
  setMetadataSettings: (settings: MetadataColumnSettings) => void;
  setExtractedQuestions: (questions: QuestionData) => void;
  resetExtractionWorkflow: () => void;

  setSelectedQuestions: (questions: Set<string>) => void;
  setError: (error: string | null) => void;

  // Complex operations
  initializeSelection: (questions: QuestionData) => void;
  startGeneration: (questions: QuestionData, forceRegenerate?: boolean) => Promise<void>;
  cancelGeneration: () => Promise<void>;
  updateProgress: (progress: TemplateGenerationProgress) => void;
  completeGeneration: (result: TemplateGenerationResult) => void;
  failGeneration: (error: string) => void;
  removeGeneratedTemplate: (questionId: string) => void;
  downloadResults: () => void;
  downloadAllGenerated: () => void;
  addToCuration: (
    questions: QuestionData,
    onTemplatesGenerated: (data: QuestionData) => void,
    onSwitchToCurator?: () => void
  ) => void;
  resetTemplateState: () => void;
  retryFailedTemplate: (questionId: string, questions: QuestionData) => Promise<void>;

  // WebSocket operations
  connectProgressWebSocket: (jobId: string) => void;
  disconnectProgressWebSocket: () => void;

  // Computed getters
  getPendingQuestions: (questions: QuestionData) => QuestionData;
  getSelectedCount: () => number;
  getGeneratedCount: () => number;
  getSuccessfulTemplates: () => Record<string, GeneratedTemplate>;
}

// Create the store
export const useTemplateStore = create<TemplateState>((set, get) => ({
  // Initial state
  config: {
    model_provider: 'google_genai',
    model_name: 'gemini-2.0-flash',
    temperature: 0.1,
    interface: 'langchain',
  },

  // Extraction workflow initial state
  uploadedFile: null,
  previewData: null,
  selectedQuestionColumn: '',
  selectedAnswerColumn: '',
  selectedSheet: '',
  currentStep: 'upload',
  advancedVisible: false,
  metadataSettings: {
    keywords_separator: ',',
  },
  extractedQuestions: {},

  selectedQuestions: new Set(),
  hasInitialized: false,
  isGenerating: false,
  progress: null,
  result: null,
  error: null,
  jobId: null,
  websocket: null,
  generatedTemplates: {},

  // Basic setters
  setConfig: (config: TemplateGenerationConfig) => set(() => ({ config })),

  // Extraction workflow setters
  setUploadedFile: (uploadedFile: FileInfo | null) => set(() => ({ uploadedFile })),
  setPreviewData: (previewData: PreviewData | null) => set(() => ({ previewData })),
  setSelectedQuestionColumn: (selectedQuestionColumn: string) => set(() => ({ selectedQuestionColumn })),
  setSelectedAnswerColumn: (selectedAnswerColumn: string) => set(() => ({ selectedAnswerColumn })),
  setSelectedSheet: (selectedSheet: string) => set(() => ({ selectedSheet })),
  setCurrentStep: (currentStep: 'upload' | 'preview' | 'configure' | 'extract' | 'visualize') =>
    set(() => ({ currentStep })),
  setAdvancedVisible: (advancedVisible: boolean) => set(() => ({ advancedVisible })),
  setMetadataSettings: (metadataSettings: MetadataColumnSettings) => set(() => ({ metadataSettings })),
  setExtractedQuestions: (extractedQuestions: QuestionData) => set(() => ({ extractedQuestions })),

  resetExtractionWorkflow: () =>
    set(() => ({
      uploadedFile: null,
      previewData: null,
      selectedQuestionColumn: '',
      selectedAnswerColumn: '',
      selectedSheet: '',
      currentStep: 'upload',
      advancedVisible: false,
      metadataSettings: { keywords_separator: ',' },
      extractedQuestions: {},
    })),

  setSelectedQuestions: (selectedQuestions: Set<string>) => set(() => ({ selectedQuestions })),
  setError: (error: string | null) => set(() => ({ error })),

  // Complex operations
  initializeSelection: (questions: QuestionData) => {
    const state = get();
    if (state.hasInitialized) return;

    const pendingQuestions = state.getPendingQuestions(questions);
    const pendingIds = Object.keys(pendingQuestions);

    if (pendingIds.length > 0 && state.selectedQuestions.size === 0) {
      set(() => ({
        selectedQuestions: new Set(pendingIds),
        hasInitialized: true,
      }));
    }
  },

  startGeneration: async (questions: QuestionData, forceRegenerate: boolean = false) => {
    const state = get();

    if (state.selectedQuestions.size === 0) {
      set(() => ({ error: 'Please select at least one question to generate templates for.' }));
      return;
    }

    set(() => ({
      isGenerating: true,
      progress: null,
      result: null,
      error: null,
    }));

    try {
      // Filter questions to only include selected ones
      const selectedQuestionsData: QuestionData = {};
      const pendingQuestions = state.getPendingQuestions(questions);

      state.selectedQuestions.forEach((id) => {
        // If force regenerate, include all selected questions regardless of previous generation
        // Otherwise only include pending questions
        if (forceRegenerate ? questions[id] : pendingQuestions[id]) {
          selectedQuestionsData[id] = questions[id];
        }
      });

      // Add cache-busting timestamp to ensure fresh generation
      const requestPayload = {
        questions: selectedQuestionsData,
        config: {
          ...state.config,
          // Add timestamp to ensure backend treats this as a fresh request
          _cache_bust: Date.now(),
        },
        force_regenerate: forceRegenerate,
      };

      const response = await fetch('/api/generate-answer-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add cache-busting headers
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      set(() => ({ jobId: data.job_id }));

      // Connect to WebSocket for real-time progress updates
      get().connectProgressWebSocket(data.job_id);
    } catch (err) {
      set(() => ({
        isGenerating: false,
        error: err instanceof Error ? err.message : 'Failed to start generation',
      }));
    }
  },

  cancelGeneration: async () => {
    const state = get();
    if (!state.jobId) return;

    try {
      await fetch(`/api/cancel-generation/${state.jobId}`, {
        method: 'POST',
      });

      // Disconnect WebSocket
      state.disconnectProgressWebSocket();

      set(() => ({
        isGenerating: false,
        progress: null,
        jobId: null,
      }));
    } catch (err) {
      handleApiError(err, 'Cancelling generation', {
        logToConsole: true,
      });
    }
  },

  updateProgress: (progress: TemplateGenerationProgress) => {
    set(() => ({ progress }));
  },

  completeGeneration: (result: TemplateGenerationResult) => {
    set((state) => ({
      isGenerating: false,
      result,
      generatedTemplates: {
        ...state.generatedTemplates,
        // Force update the newly generated templates to override any cached ones
        ...Object.fromEntries(
          Object.entries(result.templates || {}).map(([questionId, template]) => [
            questionId,
            template as GeneratedTemplate,
          ])
        ),
      },
    }));
  },

  failGeneration: (error: string) => {
    set(() => ({
      isGenerating: false,
      error: error || 'Generation failed',
    }));
  },

  removeGeneratedTemplate: (questionId: string) => {
    set((state) => {
      const updated = { ...state.generatedTemplates };
      delete updated[questionId];
      return { generatedTemplates: updated };
    });
  },

  downloadResults: () => {
    const state = get();
    if (!state.result) return;

    const dataStr = JSON.stringify(state.result.templates, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `answer_templates_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  },

  downloadAllGenerated: () => {
    const state = get();
    if (Object.keys(state.generatedTemplates).length === 0) return;

    const dataStr = JSON.stringify(state.generatedTemplates, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `all_generated_templates_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  },

  addToCuration: (
    questions: QuestionData,
    onTemplatesGenerated: (data: QuestionData) => void,
    onSwitchToCurator?: () => void
  ) => {
    const state = get();

    // Create combined data from successful generated templates
    const combinedData: QuestionData = {};

    Object.entries(state.generatedTemplates).forEach(([questionId, template]) => {
      const originalQuestion = questions[questionId];

      // Only include if original question exists AND template was successfully generated with code
      if (originalQuestion && template.success && template.template_code) {
        combinedData[questionId] = {
          ...originalQuestion,
          answer_template: template.template_code,
        };
      }
    });

    if (Object.keys(combinedData).length > 0) {
      onTemplatesGenerated(combinedData);

      // Switch to curator tab if callback is provided
      if (onSwitchToCurator) {
        onSwitchToCurator();
      }

      logger.data.templatesGenerated(Object.keys(combinedData).length);
    } else {
      logger.warn.noGeneratedTemplates();
    }
  },

  resetTemplateState: () => {
    // Disconnect WebSocket before resetting
    get().disconnectProgressWebSocket();

    set(() => ({
      config: {
        model_provider: 'google_genai',
        model_name: 'gemini-2.0-flash',
        temperature: 0.1,
        interface: 'langchain',
      },
      // Reset extraction workflow
      uploadedFile: null,
      previewData: null,
      selectedQuestionColumn: '',
      selectedAnswerColumn: '',
      selectedSheet: '',
      currentStep: 'upload',
      advancedVisible: false,
      metadataSettings: { keywords_separator: ',' },
      extractedQuestions: {},
      selectedQuestions: new Set(),
      hasInitialized: false,
      isGenerating: false,
      progress: null,
      result: null,
      error: null,
      jobId: null,
      websocket: null,
      generatedTemplates: {},
    }));
  },

  retryFailedTemplate: async (questionId: string, questions: QuestionData) => {
    const state = get();

    // Check if the question exists and has failed
    const failedTemplate = state.generatedTemplates[questionId];
    if (!failedTemplate || failedTemplate.success) {
      return;
    }

    // Check if the question data exists
    if (!questions[questionId]) {
      set(() => ({ error: 'Question not found for retry' }));
      return;
    }

    // Set selected questions to only the failed question
    set(() => ({
      selectedQuestions: new Set([questionId]),
      error: null,
    }));

    // Start generation with force regenerate
    await state.startGeneration(questions, true);
  },

  // WebSocket operations
  connectProgressWebSocket: (jobId: string) => {
    const state = get();

    // Disconnect any existing connection
    if (state.websocket) {
      state.disconnectProgressWebSocket();
    }

    try {
      // Determine WebSocket protocol based on current page protocol
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws/generation-progress/${jobId}`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        logger.info('WebSocket connected for job', jobId);
      };

      ws.onmessage = (event) => {
        try {
          const eventData = JSON.parse(event.data);

          // Handle different event types
          switch (eventData.type) {
            case 'snapshot':
            case 'job_started':
            case 'task_started':
            case 'task_completed':
              // Update progress
              state.updateProgress({
                job_id: eventData.job_id,
                status: eventData.status,
                percentage: eventData.percentage,
                processed_count: eventData.processed,
                total_count: eventData.total,
                current_question: eventData.current_question || '',
                start_time: eventData.start_time, // Unix timestamp for live clock
                duration_seconds: eventData.duration_seconds,
                last_task_duration: eventData.last_task_duration,
                in_progress_questions: eventData.in_progress_questions || [],
              });
              break;

            case 'job_completed':
              // Update progress to show completed status
              state.updateProgress({
                ...state.progress,
                job_id: jobId,
                status: 'completed',
                percentage: 100,
                in_progress_questions: [],
                current_question: '',
              } as TemplateGenerationProgress);

              // Fetch final result
              fetch(`/api/generation-progress/${jobId}`)
                .then((res) => res.json())
                .then((data) => {
                  if (data.result) {
                    state.completeGeneration(data.result);
                  }
                  state.disconnectProgressWebSocket();
                })
                .catch((err) => {
                  logger.error('Failed to fetch final result:', err);
                  state.disconnectProgressWebSocket();
                });
              break;

            case 'job_failed':
              state.failGeneration(eventData.error || 'Generation failed');
              state.disconnectProgressWebSocket();
              break;

            case 'job_cancelled':
              state.updateProgress({
                ...state.progress,
                job_id: jobId,
                status: 'cancelled',
              } as TemplateGenerationProgress);
              state.disconnectProgressWebSocket();
              break;

            default:
              logger.warn('Unknown WebSocket event type:', eventData.type);
          }
        } catch (err) {
          logger.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (error) => {
        logger.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        logger.info('WebSocket closed for job', jobId);
        set(() => ({ websocket: null }));
      };

      set(() => ({ websocket: ws }));
    } catch (err) {
      logger.error('Failed to create WebSocket connection:', err);
    }
  },

  disconnectProgressWebSocket: () => {
    const state = get();
    if (state.websocket) {
      try {
        state.websocket.close();
      } catch (err) {
        logger.error('Error closing WebSocket:', err);
      }
      set(() => ({ websocket: null }));
    }
  },

  // Computed getters
  getPendingQuestions: (questions: QuestionData) => {
    const state = get();
    const pendingQuestions: QuestionData = {};
    Object.entries(questions).forEach(([id, question]) => {
      if (!state.generatedTemplates[id] || !state.generatedTemplates[id].success) {
        pendingQuestions[id] = question;
      }
    });
    return pendingQuestions;
  },

  getSelectedCount: () => {
    const state = get();
    return state.selectedQuestions.size;
  },

  getGeneratedCount: () => {
    const state = get();
    return Object.keys(state.generatedTemplates).length;
  },

  getSuccessfulTemplates: () => {
    const state = get();
    const successful: Record<string, GeneratedTemplate> = {};
    Object.entries(state.generatedTemplates).forEach(([id, template]) => {
      if (template.success && template.template_code) {
        successful[id] = template;
      }
    });
    return successful;
  },
}));
