import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Settings, Eye, EyeOff, Upload, Maximize2, X, Download } from 'lucide-react';
import { QuestionData } from '../types';
import { CodeEditor } from './CodeEditor';

interface PromptExample {
  id: string;
  selectedQuestionId: string;
  rawQuestion: string;
  rawAnswer: string;
  pythonCode: string;
}

interface CustomPromptComposerProps {
  questions: QuestionData;
  onPromptGenerated?: (prompt: string) => void;
}

const DEFAULT_ANSWER_TEMPLATE = `class Answer(BaseAnswer):
    answer: str = Field(description="")

    def model_post_init(self, __context):
        self.id = ""
        self.correct = ""

    def verify(self) -> bool:
        return str(self.answer).strip().lower() == str(self.correct).strip().lower()`;

export const CustomPromptComposer: React.FC<CustomPromptComposerProps> = ({ questions, onPromptGenerated }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [instructions, setInstructions] = useState<string>(`<goal>
You are a helpful assistant that helps in automating the creation of a benchmark. You will receive from the user:

-A specific question;
-A JSON schema describing the structure of the Question object.

Your task:
- Generate a corresponding Pydantic class that accurately represents the expected structured output.
- Ensure each attribute in the Pydantic class has the appropriate type (int, str, float, list, etc.) reflecting the nature of the expected answer.
- Include clear and descriptive Field descriptions for each attribute, explicitly acknowledging that they represent parsed outputs from a previously provided model response.
</goal>

<important_instructions>
- Always ONLY return the code for the Pydantic class, no other text, import statements, or comments.
- The class should be named Answer.
- The class should inherit from BaseAnswer.
- The class should have a model_post_init method that sets the id and correct attributes.
- The class should have a verify method that checks if the answer is correct.
- Everytime a class extracts more then one parameter, it should have a verify_granular method that checks if the answer is correct.
- The verify_granular method should return a float between 0 and 1, where 1 means the answer is completely correct and 0 means the answer is completely incorrect.
- The verify_granular method adds 1 point to the score for each parameter that is correct and divides by the total number of parameters.
</important_instructions>`);

  const [examples, setExamples] = useState<PromptExample[]>([]);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [isPromptActive, setIsPromptActive] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadedPrompt, setUploadedPrompt] = useState<string>('');
  const [isUsingUploadedPrompt, setIsUsingUploadedPrompt] = useState(false);
  const [, setHasUnsavedChanges] = useState(false); // Used for tracking changes
  const [fullscreenExampleId, setFullscreenExampleId] = useState<string | null>(null);
  const [isFullscreenExamplesOpen, setIsFullscreenExamplesOpen] = useState(false);
  const [activeExampleId, setActiveExampleId] = useState<string>('');
  const [parseExamplesOnUpload, setParseExamplesOnUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track changes to mark unsaved state
  useEffect(() => {
    if (isPromptActive) {
      setIsPromptActive(false);
    }
  }, [isPromptActive]);

  const addExample = () => {
    const newExample: PromptExample = {
      id: `example_${Date.now()}`,
      selectedQuestionId: '',
      rawQuestion: '',
      rawAnswer: '',
      pythonCode: DEFAULT_ANSWER_TEMPLATE,
    };
    setExamples((prev) => [...prev, newExample]);

    // Set the new example as active if in fullscreen mode or if it's the first example
    if (isFullscreenExamplesOpen || examples.length === 0) {
      setActiveExampleId(newExample.id);
    }
  };

  const removeExample = (exampleId: string) => {
    setExamples((prev) => prev.filter((ex) => ex.id !== exampleId));
  };

  const updateExample = (exampleId: string, field: keyof PromptExample, value: string) => {
    setExamples((prev) =>
      prev.map((ex) => {
        if (ex.id === exampleId) {
          const updated = { ...ex, [field]: value };

          // Auto-populate raw question and answer when question is selected
          if (field === 'selectedQuestionId' && value && questions[value]) {
            updated.rawQuestion = questions[value].question;
            updated.rawAnswer = questions[value].raw_answer || '';
          }

          return updated;
        }
        return ex;
      })
    );
  };

  const parsePromptExamples = (promptContent: string): PromptExample[] => {
    const parsedExamples: PromptExample[] = [];

    // Look for examples section
    const examplesMatch = promptContent.match(/<examples>([\s\S]*?)<\/examples>/);
    if (!examplesMatch) return parsedExamples;

    const examplesContent = examplesMatch[1];

    // Find all example blocks
    const exampleRegex = /<example_(\d+)>([\s\S]*?)<\/example_\1>/g;
    let match;

    while ((match = exampleRegex.exec(examplesContent)) !== null) {
      const exampleContent = match[2];

      // Extract raw question (after "Raw question:")
      const rawQuestionMatch = exampleContent.match(/Raw question:\s*"([^"]*?)"/);
      const rawQuestion = rawQuestionMatch ? rawQuestionMatch[1] : '';

      // Extract raw answer (after "Answer:")
      const rawAnswerMatch = exampleContent.match(/Answer:\s*(.*?)(?=\n\nAnswer:|\n```python|$)/s);
      const rawAnswer = rawAnswerMatch ? rawAnswerMatch[1].trim() : '';

      // Extract Python code (between ```python and ```)
      const pythonCodeMatch = exampleContent.match(/```python\n([\s\S]*?)\n```/);
      const pythonCode = pythonCodeMatch ? pythonCodeMatch[1] : DEFAULT_ANSWER_TEMPLATE;

      const parsedExample: PromptExample = {
        id: `parsed_example_${Date.now()}_${match[1]}`,
        selectedQuestionId: '',
        rawQuestion,
        rawAnswer,
        pythonCode,
      };

      parsedExamples.push(parsedExample);
    }

    return parsedExamples;
  };

  const downloadCustomPrompt = () => {
    // Generate the prompt using the same logic as generateAndSetPrompt
    let prompt = instructions.trim();

    if (examples.length > 0) {
      prompt += '\n\n<examples>\n';

      examples.forEach((example, index) => {
        const exampleNum = index + 1;
        prompt += `\n<example_${exampleNum}>`;
        prompt += `\nRaw question:"${example.rawQuestion}"`;
        prompt += `\nAnswer: ${example.rawAnswer || 'N/A'}`;
        prompt += '\n\nAnswer:';
        prompt += '\n```python';
        prompt += `\n${example.pythonCode}`;
        prompt += '\n```';
        prompt += `\n</example_${exampleNum}>\n`;
      });

      prompt += '\n</examples>';
    }

    // Create and download the file
    const blob = new Blob([prompt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `custom-system-prompt-${timestamp}.txt`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
      alert('Please upload a text file (.txt)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        if (parseExamplesOnUpload) {
          // Parse examples from the uploaded prompt
          const parsedExamples = parsePromptExamples(content);

          if (parsedExamples.length > 0) {
            // Extract instructions (everything before <examples>)
            const instructionsMatch = content.match(/^([\s\S]*?)(?=<examples>|$)/);
            const extractedInstructions = instructionsMatch ? instructionsMatch[1].trim() : content;

            // Set the parsed data
            setInstructions(extractedInstructions);
            setExamples(parsedExamples);
            setIsUsingUploadedPrompt(false);

            // Show success message
            alert(
              `Successfully parsed ${parsedExamples.length} example${parsedExamples.length !== 1 ? 's' : ''} from the uploaded prompt.`
            );
          } else {
            // No examples found, treat as regular upload
            setUploadedPrompt(content);
            setIsUsingUploadedPrompt(true);
            alert('No examples found in the uploaded prompt. Using as uploaded prompt.');
          }
        } else {
          // Use as uploaded prompt without parsing
          setUploadedPrompt(content);
          setIsUsingUploadedPrompt(true);
        }

        setIsPromptActive(true);
        setHasUnsavedChanges(false);

        // Notify parent component
        if (onPromptGenerated) {
          onPromptGenerated(content);
        }
      }
    };
    reader.readAsText(file);

    // Clear the input so the same file can be uploaded again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const switchToCustomComposer = () => {
    setIsUsingUploadedPrompt(false);
    setUploadedPrompt('');
    setIsPromptActive(false);
  };

  const exitFullscreen = () => {
    setFullscreenExampleId(null);
    document.body.style.overflow = 'auto';
  };

  const openFullscreenExamples = () => {
    setIsFullscreenExamplesOpen(true);
    document.body.style.overflow = 'hidden';
    // Set the first example as active if none is selected
    if (examples.length > 0 && !activeExampleId) {
      setActiveExampleId(examples[0].id);
    }
  };

  const closeFullscreenExamples = () => {
    setIsFullscreenExamplesOpen(false);
    document.body.style.overflow = 'auto';
  };

  const switchToExample = (exampleId: string) => {
    setActiveExampleId(exampleId);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isFullscreenExamplesOpen) {
          closeFullscreenExamples();
        } else if (fullscreenExampleId) {
          exitFullscreen();
        }
      }

      // Example navigation shortcuts (Ctrl/Cmd + 1-9) when in fullscreen examples mode
      if (isFullscreenExamplesOpen && (event.ctrlKey || event.metaKey)) {
        const num = parseInt(event.key);
        if (num >= 1 && num <= 9 && num <= examples.length) {
          event.preventDefault();
          const targetExample = examples[num - 1];
          if (targetExample) {
            setActiveExampleId(targetExample.id);
          }
        }
      }
    };

    if (isFullscreenExamplesOpen || fullscreenExampleId) {
      document.addEventListener('keydown', handleKeyboard);
      return () => {
        document.removeEventListener('keydown', handleKeyboard);
      };
    }
  }, [isFullscreenExamplesOpen, fullscreenExampleId, examples]);

  // Cleanup body overflow on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const generateAndSetPrompt = () => {
    // Build the complete prompt
    let prompt = instructions.trim();

    if (examples.length > 0) {
      prompt += '\n\n<examples>\n';

      examples.forEach((example, index) => {
        const exampleNum = index + 1;
        prompt += `\n<example_${exampleNum}>`;
        prompt += `\nRaw question:"${example.rawQuestion}"`;
        prompt += `\nAnswer: ${example.rawAnswer || 'N/A'}`;
        prompt += '\n\nAnswer:';
        prompt += '\n```python';
        prompt += `\n${example.pythonCode}`;
        prompt += '\n```';
        prompt += `\n</example_${exampleNum}>\n`;
      });

      prompt += '\n</examples>';
    }

    setGeneratedPrompt(prompt);
    setIsPromptActive(true);
    setHasUnsavedChanges(false);
    setIsUsingUploadedPrompt(false);

    // Notify parent component
    if (onPromptGenerated) {
      onPromptGenerated(prompt);
    }
  };

  const questionIds = Object.keys(questions);
  const canGenerate = instructions.trim().length > 0;

  if (!isExpanded) {
    return (
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Custom System Prompt</h3>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md"
                onChange={handleFileUpload}
                className="hidden"
                id="prompt-upload"
              />
              <label
                htmlFor="prompt-upload"
                className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-xl hover:bg-green-700 dark:hover:bg-green-600 transition-colors flex items-center gap-2 cursor-pointer font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Upload className="w-4 h-4" />
                Upload System Prompt
              </label>
              <button
                onClick={() => setIsExpanded(true)}
                className="px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
              >
                <Settings className="w-4 h-4" />
                Customize Prompt
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="parse-examples-collapsed"
                checked={parseExamplesOnUpload}
                onChange={(e) => setParseExamplesOnUpload(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="parse-examples-collapsed" className="text-sm text-slate-600 dark:text-slate-300">
                Parse examples from uploaded prompt into graphical interface
              </label>
            </div>
          </div>
        </div>

        <p className="text-slate-600 dark:text-slate-300 mb-6">
          Create custom system prompts with your own instructions and examples to guide template generation. The prompt
          will be used when generating answer templates for the selected questions.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Custom System Prompt</h3>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md"
              onChange={handleFileUpload}
              className="hidden"
              id="prompt-upload"
            />
            <label
              htmlFor="prompt-upload"
              className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-xl hover:bg-green-700 dark:hover:bg-green-600 transition-colors flex items-center gap-2 cursor-pointer font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Upload className="w-4 h-4" />
              Upload System Prompt
            </label>
            <button
              onClick={() => setIsExpanded(false)}
              className="px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-xl hover:bg-gray-700 dark:hover:bg-gray-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
            >
              Collapse
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="parse-examples-expanded"
              checked={parseExamplesOnUpload}
              onChange={(e) => setParseExamplesOnUpload(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="parse-examples-expanded" className="text-sm text-slate-600 dark:text-slate-300">
              Parse examples from uploaded prompt into graphical interface
            </label>
          </div>
        </div>
      </div>

      <p className="text-slate-600 dark:text-slate-300 mb-6">
        Create custom system prompts with your own instructions and examples to guide template generation. The prompt
        will be used when generating answer templates for the selected questions.
      </p>

      {/* Uploaded Prompt Display */}
      {isUsingUploadedPrompt && uploadedPrompt && (
        <div className="border border-green-200 dark:border-green-700 rounded-lg p-4 bg-green-50 dark:bg-green-900/30">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-md font-semibold text-green-800 dark:text-green-300 flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Uploaded System Prompt Active
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-3 py-1 bg-green-600 dark:bg-green-700 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-sm flex items-center gap-1"
              >
                {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </button>
              <button
                onClick={switchToCustomComposer}
                className="px-3 py-1 bg-indigo-600 dark:bg-indigo-700 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors text-sm"
              >
                Switch to Composer
              </button>
            </div>
          </div>
          <p className="text-sm text-green-700 dark:text-green-300 mb-2">
            Using uploaded system prompt. Click "Switch to Composer" to edit custom instructions and examples instead.
          </p>
          {showPreview && (
            <div>
              <h5 className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">Uploaded Prompt Preview</h5>
              <div className="bg-white dark:bg-slate-800 border border-green-200 dark:border-green-700 rounded-md p-3 max-h-60 overflow-y-auto">
                <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
                  {uploadedPrompt}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custom Composer - Only show when not using uploaded prompt */}
      {!isUsingUploadedPrompt && (
        <>
          {/* Instructions Editor */}
          <div className="mb-6">
            <label
              htmlFor="instructions-textarea"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              Free-text Instructions
            </label>
            <textarea
              id="instructions-textarea"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full h-64 p-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 font-mono text-sm resize-y bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
              placeholder="Enter your high-level instructions that will head the system prompt..."
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              These instructions will be placed at the beginning of your custom system prompt.
            </p>
          </div>

          {/* Examples Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-semibold text-slate-700 dark:text-slate-300">Examples</h4>
              <div className="flex items-center gap-2">
                {examples.length > 0 && (
                  <button
                    onClick={openFullscreenExamples}
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    title="Open fullscreen examples editor"
                  >
                    <Maximize2 className="w-4 h-4" />
                    Fullscreen Examples Editor
                  </button>
                )}
                <button
                  onClick={addExample}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Plus className="w-4 h-4" />
                  Add Example
                </button>
              </div>
            </div>

            {examples.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-700 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600">
                <p className="text-slate-500 dark:text-slate-400">
                  No examples yet. Click "Add Example" to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {examples.map((example, index) => (
                  <div
                    key={example.id}
                    className="border border-slate-200 dark:border-slate-600 rounded-lg p-4 bg-slate-50 dark:bg-slate-700"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="font-medium text-slate-700 dark:text-slate-300">Example {index + 1}</h5>
                      <button
                        onClick={() => removeExample(example.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                        aria-label="Remove example"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Left Column - Question Selection */}
                      <div className="space-y-4">
                        {/* Question Selector */}
                        <div>
                          <label
                            htmlFor={`question-selector-${example.id}`}
                            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                          >
                            Question Selector
                          </label>
                          <select
                            id={`question-selector-${example.id}`}
                            value={example.selectedQuestionId}
                            onChange={(e) => updateExample(example.id, 'selectedQuestionId', e.target.value)}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                          >
                            <option value="">Select a question...</option>
                            {questionIds.map((id) => (
                              <option key={id} value={id}>
                                {questions[id].question.substring(0, 60)}
                                {questions[id].question.length > 60 ? '...' : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Raw Question */}
                        <div>
                          <label
                            htmlFor={`raw-question-${example.id}`}
                            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                          >
                            Raw Question
                          </label>
                          <textarea
                            id={`raw-question-${example.id}`}
                            value={example.rawQuestion}
                            readOnly
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-sm h-20 resize-y bg-slate-50 dark:bg-slate-600 text-slate-900 dark:text-slate-100"
                            placeholder="Raw question text..."
                          />
                        </div>

                        {/* Raw Answer */}
                        <div>
                          <label
                            htmlFor={`raw-answer-${example.id}`}
                            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                          >
                            Raw Answer
                          </label>
                          <textarea
                            id={`raw-answer-${example.id}`}
                            value={example.rawAnswer}
                            readOnly
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-sm h-20 resize-y bg-slate-50 dark:bg-slate-600 text-slate-900 dark:text-slate-100"
                            placeholder="Raw answer text..."
                          />
                        </div>
                      </div>

                      {/* Right Column - Python Code Editor */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Python Example Code
                        </label>
                        <div className="h-96">
                          <CodeEditor
                            value={example.pythonCode}
                            onChange={(value) => updateExample(example.id, 'pythonCode', value)}
                            enableFormEditor={true}
                            originalCode={DEFAULT_ANSWER_TEMPLATE}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Generate Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={generateAndSetPrompt}
                disabled={!canGenerate}
                className="px-6 py-3 bg-indigo-600 dark:bg-indigo-700 text-white rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
              >
                <Settings className="w-4 h-4" />
                Generate & Set Prompt
              </button>

              <button
                onClick={downloadCustomPrompt}
                disabled={!canGenerate}
                className="px-4 py-3 bg-green-600 dark:bg-green-700 text-white rounded-xl hover:bg-green-700 dark:hover:bg-green-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
                title="Download custom system prompt as .txt file"
              >
                <Download className="w-4 h-4" />
                Download Prompt
              </button>

              {generatedPrompt && !isUsingUploadedPrompt && (
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="px-4 py-2 bg-slate-600 dark:bg-slate-700 text-white rounded-xl hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
              )}
            </div>

            <div className="text-sm text-slate-600 dark:text-slate-400">
              {examples.length} example{examples.length !== 1 ? 's' : ''} configured
            </div>
          </div>
        </>
      )}

      {/* Prompt Preview - for generated prompts only (uploaded prompts have their own preview above) */}
      {showPreview && generatedPrompt && !isUsingUploadedPrompt && (
        <div className="border-t border-slate-200 dark:border-slate-600 pt-6 mt-6">
          <h4 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-3">Generated Prompt Preview</h4>
          <div className="bg-slate-900 dark:bg-slate-950 text-white p-4 rounded-lg overflow-auto max-h-96">
            <pre className="text-sm whitespace-pre-wrap font-mono">{generatedPrompt}</pre>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            This is the complete system prompt that will be used for template generation.
          </p>
        </div>
      )}

      {/* Fullscreen Modal */}
      {fullscreenExampleId && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="w-full h-full bg-white dark:bg-slate-900 flex flex-col">
            {/* Fullscreen Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-600">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Python Example Code Editor - Example {examples.findIndex((ex) => ex.id === fullscreenExampleId) + 1}
                </h3>
              </div>
              <button
                onClick={exitFullscreen}
                className="px-4 py-2 bg-slate-600 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                title="Exit fullscreen (Esc)"
              >
                <X className="w-4 h-4" />
                Close
              </button>
            </div>

            {/* Fullscreen Editor */}
            <div className="flex-1 p-6">
              {(() => {
                const fullscreenExample = examples.find((ex) => ex.id === fullscreenExampleId);
                if (!fullscreenExample) return null;

                return (
                  <div className="h-full">
                    <CodeEditor
                      value={fullscreenExample.pythonCode}
                      onChange={(value) => updateExample(fullscreenExample.id, 'pythonCode', value)}
                      enableFormEditor={true}
                      originalCode={DEFAULT_ANSWER_TEMPLATE}
                    />
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Examples Editor */}
      {isFullscreenExamplesOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black bg-opacity-50">
            <div className="w-full h-full bg-white dark:bg-slate-900 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-600">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Examples Editor</h3>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {examples.length} example{examples.length !== 1 ? 's' : ''} configured
                  </span>
                </div>
                <button
                  onClick={closeFullscreenExamples}
                  className="px-4 py-2 bg-slate-600 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  title="Close examples editor (Esc)"
                >
                  <X className="w-4 h-4" />
                  Close
                </button>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex min-h-0">
                {/* Left Sidebar - Examples Navigation */}
                <div className="w-1/4 bg-slate-50 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-600 flex flex-col">
                  {/* Examples Tabs */}
                  <div className="p-4 border-b border-slate-300 dark:border-slate-600">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Examples</h4>
                      <button
                        onClick={addExample}
                        className="px-2 py-1 bg-green-600 dark:bg-green-700 text-white rounded text-xs hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
                        title="Add new example"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      {examples.map((example, index) => (
                        <button
                          key={example.id}
                          onClick={() => switchToExample(example.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                            activeExampleId === example.id
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'
                          }`}
                        >
                          <span>Example {index + 1}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeExample(example.id);
                              // If we deleted the active example, switch to the first remaining one
                              if (activeExampleId === example.id && examples.length > 1) {
                                const remainingExamples = examples.filter((ex) => ex.id !== example.id);
                                if (remainingExamples.length > 0) {
                                  setActiveExampleId(remainingExamples[0].id);
                                }
                              }
                            }}
                            className="p-1 hover:bg-red-500 hover:text-white rounded transition-colors"
                            title="Delete example"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active Example Details */}
                  {(() => {
                    const activeExample = examples.find((ex) => ex.id === activeExampleId);
                    if (!activeExample) return null;

                    return (
                      <div className="p-4 flex-1 space-y-4">
                        {/* Question Selector */}
                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Question Selector
                          </label>
                          <select
                            value={activeExample.selectedQuestionId}
                            onChange={(e) => updateExample(activeExample.id, 'selectedQuestionId', e.target.value)}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                          >
                            <option value="">Select a question...</option>
                            {Object.keys(questions).map((id) => (
                              <option key={id} value={id}>
                                {questions[id].question.substring(0, 40)}
                                {questions[id].question.length > 40 ? '...' : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Raw Question */}
                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Raw Question
                          </label>
                          <textarea
                            value={activeExample.rawQuestion}
                            readOnly
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded text-xs h-16 resize-none bg-slate-50 dark:bg-slate-600 text-slate-900 dark:text-slate-100"
                            placeholder="Raw question text..."
                          />
                        </div>

                        {/* Raw Answer */}
                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Raw Answer
                          </label>
                          <textarea
                            value={activeExample.rawAnswer}
                            readOnly
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded text-xs h-16 resize-none bg-slate-50 dark:bg-slate-600 text-slate-900 dark:text-slate-100"
                            placeholder="Raw answer text..."
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Right Editor Area */}
                <div className="flex-1 flex flex-col">
                  {(() => {
                    const activeExample = examples.find((ex) => ex.id === activeExampleId);
                    if (!activeExample) {
                      return (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="text-center text-slate-500 dark:text-slate-400">
                            <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No example selected</p>
                            <p className="text-sm">Select an example from the sidebar to edit</p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="flex-1 p-6">
                        <div className="h-full">
                          <CodeEditor
                            value={activeExample.pythonCode}
                            onChange={(value) => updateExample(activeExample.id, 'pythonCode', value)}
                            enableFormEditor={true}
                            originalCode={DEFAULT_ANSWER_TEMPLATE}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
