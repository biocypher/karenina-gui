import React, { useState, useEffect } from 'react';
import { Plus, X, Settings, Loader2, Sparkles } from 'lucide-react';
import { Modal } from './ui/Modal';
import { useConfigStore } from '../stores/useConfigStore';

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

interface GenerationConfig {
  model_provider: string;
  model_name: string;
  temperature: number;
  interface: 'langchain' | 'openrouter';
}

export const AddQuestionModal: React.FC<AddQuestionModalProps> = ({ isOpen, onClose, onAdd }) => {
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

  // Poll for generation progress
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isGenerating && jobId) {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/generation-progress/${jobId}`);
          const progressData = await response.json();

          if (progressData.status === 'completed') {
            setIsGenerating(false);
            setJobId(null);
            // Extract the generated template from the result
            if (progressData.result && Object.keys(progressData.result).length > 0) {
              // API returns: { templates: { question_id: { template_code, ... } }, ... }
              // Extract templates object (with fallback for old API format)
              const templates = progressData.result.templates || progressData.result;
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
                console.log('✅ Template extracted successfully:', extractedTemplate.substring(0, 50) + '...');
              } else {
                // Generation succeeded but template is invalid
                const errorMsg =
                  (resultObj && typeof resultObj === 'object' && 'error' in resultObj && resultObj.error) ||
                  'Generated template was empty';
                setGenerationError(String(errorMsg));
                setGeneratedTemplate(null);
                console.warn('⚠️ Template generation completed but template is invalid:', errorMsg);
              }
            }
          } else if (progressData.status === 'failed') {
            setIsGenerating(false);
            setJobId(null);
            setGenerationError(progressData.error || 'Template generation failed');
          }
        } catch (error) {
          console.error('Error polling generation progress:', error);
          setIsGenerating(false);
          setJobId(null);
          setGenerationError('Failed to check generation progress');
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
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

      const response = await fetch('/api/generate-answer-templates', {
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
      console.error('Error starting template generation:', error);
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
            <strong>💡 Tip:</strong> Add a new question manually to your benchmark. A basic Pydantic template will be
            auto-generated, which you can then edit in the Template Curator.
          </p>
        </div>

        {/* Question Field */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Question <span className="text-red-500">*</span>
          </label>
          <textarea
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
              if (errors.question) setErrors({ ...errors, question: undefined });
            }}
            rows={4}
            placeholder="Enter the question text..."
            className={`w-full px-4 py-3 border ${
              errors.question ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'
            } rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-y`}
          />
          {errors.question && <p className="mt-1 text-sm text-red-500">{errors.question}</p>}
        </div>

        {/* Raw Answer Field */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Raw Answer <span className="text-red-500">*</span>
          </label>
          <textarea
            value={rawAnswer}
            onChange={(e) => {
              setRawAnswer(e.target.value);
              if (errors.rawAnswer) setErrors({ ...errors, rawAnswer: undefined });
            }}
            rows={4}
            placeholder="Enter the answer text..."
            className={`w-full px-4 py-3 border ${
              errors.rawAnswer ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'
            } rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-y`}
          />
          {errors.rawAnswer && <p className="mt-1 text-sm text-red-500">{errors.rawAnswer}</p>}
        </div>

        {/* Optional Metadata */}
        <div className="border-t border-slate-200 dark:border-slate-600 pt-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Optional Metadata</h4>

          {/* Author Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Author</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Question author name..."
              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          {/* Keywords Field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Keywords (comma-separated)
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g., math, geometry, basic"
              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>
        </div>

        {/* Template Generation Section */}
        <div className="border-t border-slate-200 dark:border-slate-600 pt-4">
          <div className="space-y-4">
            {/* Button Row */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerateTemplate}
                disabled={!question.trim() || !rawAnswer.trim() || isGenerating}
                className="px-4 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Answer Template
                  </>
                )}
              </button>

              {/* Settings Toggle Button */}
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                disabled={isGenerating}
                className="p-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Generation settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            {/* Collapsible Settings Panel */}
            {isSettingsOpen && (
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-600 rounded-lg p-4 space-y-4">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Generation Settings</h4>

                {/* Interface Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Interface</label>
                  <div className="flex gap-4">
                    <label className="flex items-center text-slate-900 dark:text-white">
                      <input
                        type="radio"
                        value="langchain"
                        checked={config.interface === 'langchain'}
                        onChange={(e) =>
                          setConfig({ ...config, interface: e.target.value as 'langchain' | 'openrouter' })
                        }
                        className="mr-2"
                      />
                      LangChain
                    </label>
                    <label className="flex items-center text-slate-900 dark:text-white">
                      <input
                        type="radio"
                        value="openrouter"
                        checked={config.interface === 'openrouter'}
                        onChange={(e) =>
                          setConfig({ ...config, interface: e.target.value as 'langchain' | 'openrouter' })
                        }
                        className="mr-2"
                      />
                      OpenRouter
                    </label>
                  </div>
                </div>

                {/* Provider (for LangChain) */}
                {config.interface === 'langchain' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Provider
                    </label>
                    <input
                      type="text"
                      value={config.model_provider}
                      onChange={(e) => setConfig({ ...config, model_provider: e.target.value })}
                      placeholder="e.g., openai, google_genai, anthropic"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                )}

                {/* Model Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Model Name
                  </label>
                  <input
                    type="text"
                    value={config.model_name}
                    onChange={(e) => setConfig({ ...config, model_name: e.target.value })}
                    placeholder={config.interface === 'openrouter' ? 'e.g., openai/gpt-4' : 'e.g., gpt-4.1-mini'}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Temperature */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Temperature: {config.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={config.temperature}
                    onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Status Messages */}
            <div>
              {/* Status Messages */}
              {generatedTemplate && (
                <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  Template generated successfully!
                </div>
              )}
              {generationError && (
                <div className="text-sm text-red-600 dark:text-red-400">Error: {generationError}</div>
              )}
            </div>
          </div>
        </div>

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
