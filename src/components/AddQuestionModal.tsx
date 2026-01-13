import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { Modal } from './ui/Modal';
import { useConfigStore } from '../stores/useConfigStore';
import { csrf } from '../utils/csrf';
import { logger } from '../utils/logger';
import { connectTemplateProgressWebSocket, disconnectTemplateProgressWebSocket } from '../services/templateWebSocket';
import { QuestionFormInputs, QuestionMetadataForm, TemplateGenerationSection, GenerationConfig } from './addQuestion';

interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (
    question: string,
    rawAnswer: string,
    author?: string,
    keywords?: string[],
    generatedTemplate?: string
  ) => void;
}

export const AddQuestionModal: React.FC<AddQuestionModalProps> = ({ isOpen, onClose, onAdd }) => {
  // Form state
  const [question, setQuestion] = useState('');
  const [rawAnswer, setRawAnswer] = useState('');
  const [author, setAuthor] = useState('');
  const [keywords, setKeywords] = useState('');
  const [errors, setErrors] = useState<{ question?: string; rawAnswer?: string }>({});

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [generatedTemplate, setGeneratedTemplate] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Configuration from store
  const { savedInterface, savedProvider, savedModel } = useConfigStore();

  // Local generation config
  const [config, setConfig] = useState<GenerationConfig>({
    model_provider: savedProvider,
    model_name: savedModel,
    temperature: 0.1,
    interface: savedInterface as 'langchain' | 'openrouter',
  });

  // Update config when saved values change
  useEffect(() => {
    setConfig((prev) => ({
      ...prev,
      model_provider: savedProvider,
      model_name: savedModel,
      interface: savedInterface as 'langchain' | 'openrouter',
    }));
  }, [savedProvider, savedModel, savedInterface]);

  // WebSocket for generation progress (replaces polling)
  useEffect(() => {
    if (isGenerating && jobId) {
      // Connect to WebSocket for real-time progress updates
      connectTemplateProgressWebSocket(jobId, {
        onProgressUpdate: (progress) => {
          // Optional: Show progress percentage or current question being processed
          if (progress.current_question) {
            logger.debugLog('TEMPLATE', `Processing: ${progress.current_question}`, 'AddQuestionModal');
          }
        },
        onCompleted: (result) => {
          setIsGenerating(false);
          setJobId(null);
          // Extract the generated template from the result
          if (result && Object.keys(result).length > 0) {
            // API returns: { templates: { question_id: { template_code, ... } }, ... }
            // Extract templates object (with fallback for old API format)
            const templates = result.templates || result;
            const firstQuestionId = Object.keys(templates)[0];
            const resultObj = templates[firstQuestionId];

            // Extract and validate template code from result object
            let extractedTemplate: string | null = null;

            if (resultObj && typeof resultObj === 'object') {
              // Result is an object with template_code field (current API)
              if ('template_code' in resultObj && typeof resultObj.template_code === 'string') {
                extractedTemplate = resultObj.template_code.trim();
              }
            } else if (typeof resultObj === 'string') {
              // Fallback: result is already a string (backwards compatibility)
              extractedTemplate = resultObj.trim();
            }

            // Validate we got a valid template
            if (extractedTemplate && extractedTemplate.length > 0) {
              setGeneratedTemplate(extractedTemplate);
              setGenerationError(null);
              logger.debugLog(
                'TEMPLATE',
                `Template extracted successfully: ${extractedTemplate.substring(0, 50)}...`,
                'AddQuestionModal'
              );
            } else {
              // Generation succeeded but template is invalid
              const errorMsg =
                (resultObj && typeof resultObj === 'object' && 'error' in resultObj && resultObj.error) ||
                'Generated template was empty';
              setGenerationError(String(errorMsg));
              setGeneratedTemplate(null);
              logger.warning('TEMPLATE', 'Template generation completed but template is invalid', 'AddQuestionModal', {
                error: errorMsg,
              });
            }
          }
        },
        onFailed: (error) => {
          setIsGenerating(false);
          setJobId(null);
          setGenerationError(error || 'Template generation failed');
        },
        onCancelled: () => {
          setIsGenerating(false);
          setJobId(null);
          setGenerationError('Template generation was cancelled');
        },
      });
    }

    // Cleanup: disconnect WebSocket when generation ends or component unmounts
    return () => {
      if (jobId) {
        disconnectTemplateProgressWebSocket();
      }
    };
  }, [isGenerating, jobId]);

  const handleGenerateTemplate = async () => {
    if (!question.trim() || !rawAnswer.trim()) return;

    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedTemplate(null);

    try {
      // Create a temporary question ID for generation
      const tempId = crypto.randomUUID();
      const questionsData = {
        [tempId]: {
          question: question.trim(),
          raw_answer: rawAnswer.trim(),
          answer_template: '', // Will be generated
        },
      };

      const response = await csrf.fetchWithCsrf('/api/generate-answer-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: questionsData,
          config: config,
          force_regenerate: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start template generation');
      }

      const data = await response.json();
      setJobId(data.job_id);
    } catch (error) {
      logger.error('TEMPLATE', 'Error starting template generation', 'AddQuestionModal', { error });
      setIsGenerating(false);
      setGenerationError(error instanceof Error ? error.message : 'Failed to start generation');
    }
  };

  const handleSubmit = () => {
    // Validate inputs
    const newErrors: { question?: string; rawAnswer?: string } = {};

    if (!question.trim()) {
      newErrors.question = 'Question is required';
    }

    if (!rawAnswer.trim()) {
      newErrors.rawAnswer = 'Answer is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Parse keywords (comma-separated)
    const keywordList = keywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    // Call onAdd with the data, including generated template if available
    onAdd(
      question.trim(),
      rawAnswer.trim(),
      author.trim() || undefined,
      keywordList.length > 0 ? keywordList : undefined,
      generatedTemplate || undefined
    );

    // Reset form
    handleReset();
  };

  const handleReset = () => {
    setQuestion('');
    setRawAnswer('');
    setAuthor('');
    setKeywords('');
    setErrors({});
    setGeneratedTemplate(null);
    setGenerationError(null);
    setIsGenerating(false);
    setJobId(null);
    setIsSettingsOpen(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Question" size="lg">
      <div className="space-y-6">
        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Tip:</strong> Add a new question manually to your benchmark. A basic Pydantic template will be
            auto-generated, which you can then edit in the Template Curator.
          </p>
        </div>

        {/* Question and Answer Inputs */}
        <QuestionFormInputs
          question={question}
          rawAnswer={rawAnswer}
          errors={errors}
          onQuestionChange={setQuestion}
          onRawAnswerChange={setRawAnswer}
          onClearQuestionError={() => setErrors({ ...errors, question: undefined })}
          onClearRawAnswerError={() => setErrors({ ...errors, rawAnswer: undefined })}
          disabled={isGenerating}
        />

        {/* Optional Metadata */}
        <QuestionMetadataForm
          author={author}
          keywords={keywords}
          onAuthorChange={setAuthor}
          onKeywordsChange={setKeywords}
          disabled={isGenerating}
        />

        {/* Template Generation Section */}
        <TemplateGenerationSection
          isGenerating={isGenerating}
          hasQuestion={question.trim().length > 0}
          hasRawAnswer={rawAnswer.trim().length > 0}
          generatedTemplate={generatedTemplate}
          generationError={generationError}
          isSettingsOpen={isSettingsOpen}
          config={config}
          onGenerate={handleGenerateTemplate}
          onToggleSettings={() => setIsSettingsOpen(!isSettingsOpen)}
          onConfigChange={setConfig}
        />

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-600 pt-4">
          <button
            onClick={handleClose}
            disabled={isGenerating}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4 inline mr-2" />
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isGenerating}
            className="px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>
        </div>
      </div>
    </Modal>
  );
};
