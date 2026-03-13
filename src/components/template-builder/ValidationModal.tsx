import { useState, useEffect } from 'react';
import { useTemplateBuilderStore } from '../../stores/useTemplateBuilderStore';

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'quick-check' | 'test-response' | 'judge-preview';

export function ValidationModal({ isOpen, onClose }: ValidationModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('quick-check');
  const [sampleResponse, setSampleResponse] = useState('');
  const [questionText, setQuestionText] = useState('');

  const fields = useTemplateBuilderStore((s) => s.spec.fields);
  const validationResult = useTemplateBuilderStore((s) => s.validationResult);
  const testResult = useTemplateBuilderStore((s) => s.testResult);
  const isLoading = useTemplateBuilderStore((s) => s.isLoading);
  const validateTemplate = useTemplateBuilderStore((s) => s.validateTemplate);
  const testTemplate = useTemplateBuilderStore((s) => s.testTemplate);

  // Run quick-check validation on mount and when switching to that tab
  useEffect(() => {
    if (isOpen && activeTab === 'quick-check') {
      validateTemplate();
    }
  }, [isOpen, activeTab, validateTemplate]);

  if (!isOpen) return null;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'quick-check', label: 'Quick Check' },
    { key: 'test-response', label: 'Test with Response' },
    { key: 'judge-preview', label: 'Judge Preview' },
  ];

  const handleRunTest = () => {
    testTemplate(sampleResponse, questionText);
  };

  // Derive JSON schema preview from fields (client-side only)
  const fieldSchemaRows = fields.map((f) => {
    const typeMap: Record<string, string> = {
      bool: 'boolean',
      str: 'string',
      int: 'integer',
      float: 'number',
      list_str: 'array (string items)',
      literal: `enum`,
      date: 'string (date)',
    };
    return {
      name: f.name,
      type: typeMap[f.type] ?? f.type,
      description: f.description || '(no description)',
    };
  });

  const jsonSchemaPreview = {
    type: 'object',
    properties: Object.fromEntries(
      fields.map((f) => {
        const base: Record<string, unknown> = {};
        switch (f.type) {
          case 'bool':
            base.type = 'boolean';
            break;
          case 'str':
            base.type = 'string';
            break;
          case 'int':
            base.type = 'integer';
            break;
          case 'float':
            base.type = 'number';
            break;
          case 'list_str':
            base.type = 'array';
            base.items = { type: 'string' };
            break;
          case 'literal':
            base.enum = f.literal_values ?? [];
            break;
          case 'date':
            base.type = 'string';
            base.format = 'date';
            break;
          default:
            base.type = 'string';
        }
        if (f.description) base.description = f.description;
        return [f.name, base];
      })
    ),
    required: fields.map((f) => f.name),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
          <h2 className="text-base font-semibold text-gray-200">Template Validation</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors text-lg"
            title="Close"
          >
            &#x2715;
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800/50'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/30'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'quick-check' && (
            <QuickCheckContent validationResult={validationResult} isLoading={isLoading} />
          )}
          {activeTab === 'test-response' && (
            <TestResponseContent
              sampleResponse={sampleResponse}
              setSampleResponse={setSampleResponse}
              questionText={questionText}
              setQuestionText={setQuestionText}
              onRunTest={handleRunTest}
              testResult={testResult}
              isLoading={isLoading}
            />
          )}
          {activeTab === 'judge-preview' && (
            <JudgePreviewContent fieldSchemaRows={fieldSchemaRows} jsonSchemaPreview={jsonSchemaPreview} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 1: Quick Check                                                */
/* ------------------------------------------------------------------ */

function QuickCheckContent({
  validationResult,
  isLoading,
}: {
  validationResult: ReturnType<typeof useTemplateBuilderStore.getState>['validationResult'];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <div className="text-center py-8 text-gray-500 text-sm">Running validation...</div>;
  }

  if (!validationResult) {
    return <div className="text-center py-8 text-gray-500 text-sm">No validation result available.</div>;
  }

  const checks = [
    {
      label: 'Template validity',
      pass: validationResult.valid,
    },
    {
      label: 'Ground truth check',
      pass: validationResult.ground_truth_check,
    },
    {
      label: 'verify() check',
      pass: validationResult.verify_check,
    },
  ];

  return (
    <div className="space-y-3">
      {validationResult.errors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-xs font-semibold text-red-400 mb-1">Errors</p>
          <ul className="space-y-1">
            {validationResult.errors.map((err, i) => (
              <li key={i} className="text-xs text-red-300 font-mono">
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-3 px-3 py-2 bg-gray-800 rounded-lg">
            <StatusIndicator pass={check.pass} />
            <span className="text-sm text-gray-200">{check.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 2: Test with Response                                          */
/* ------------------------------------------------------------------ */

function TestResponseContent({
  sampleResponse,
  setSampleResponse,
  questionText,
  setQuestionText,
  onRunTest,
  testResult,
  isLoading,
}: {
  sampleResponse: string;
  setSampleResponse: (v: string) => void;
  questionText: string;
  setQuestionText: (v: string) => void;
  onRunTest: () => void;
  testResult: ReturnType<typeof useTemplateBuilderStore.getState>['testResult'];
  isLoading: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Input section */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Question Text</label>
          <input
            type="text"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Enter the question text..."
            className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Sample Response</label>
          <textarea
            value={sampleResponse}
            onChange={(e) => setSampleResponse(e.target.value)}
            placeholder="Paste a sample LLM response here..."
            rows={5}
            className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-y font-mono"
          />
        </div>
        <button
          onClick={onRunTest}
          disabled={isLoading || !sampleResponse.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Running...' : 'Run Test'}
        </button>
      </div>

      {/* Results section */}
      {testResult && (
        <div className="space-y-3 border-t border-gray-700 pt-4">
          {testResult.error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-xs text-red-300 font-mono">{testResult.error}</p>
            </div>
          )}

          {/* Verify result and granular score */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg">
              <StatusIndicator pass={testResult.verify_result} />
              <span className="text-sm text-gray-200">verify()</span>
            </div>
            {testResult.verify_granular !== null && (
              <div className="px-3 py-2 bg-gray-800 rounded-lg">
                <span className="text-xs text-gray-400">Granular score: </span>
                <span className="text-sm font-mono text-gray-200">{testResult.verify_granular.toFixed(3)}</span>
              </div>
            )}
          </div>

          {/* Parsed field values */}
          {testResult.parsed_fields && (
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Parsed Fields</p>
              <div className="space-y-1">
                {Object.entries(testResult.parsed_fields).map(([key, value]) => {
                  const fieldPass = testResult.field_results?.[key];
                  return (
                    <div key={key} className="flex items-center gap-3 px-3 py-1.5 bg-gray-800 rounded-lg">
                      {fieldPass !== undefined && <StatusIndicator pass={fieldPass} />}
                      <span className="text-xs font-mono text-gray-400 min-w-[120px]">{key}</span>
                      <span className="text-xs font-mono text-gray-200 truncate">{JSON.stringify(value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 3: Judge Preview                                               */
/* ------------------------------------------------------------------ */

function JudgePreviewContent({
  fieldSchemaRows,
  jsonSchemaPreview,
}: {
  fieldSchemaRows: { name: string; type: string; description: string }[];
  jsonSchemaPreview: Record<string, unknown>;
}) {
  return (
    <div className="space-y-4">
      {/* Field table */}
      <div>
        <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Field Schema</p>
        {fieldSchemaRows.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-sm">
            No fields defined. Add fields to preview the judge schema.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Field
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {fieldSchemaRows.map((row) => (
                <tr key={row.name} className="border-b border-gray-800 hover:bg-gray-800/30">
                  <td className="py-2 px-3 font-mono text-gray-200">{row.name || '(unnamed)'}</td>
                  <td className="py-2 px-3 font-mono text-blue-400">{row.type}</td>
                  <td className="py-2 px-3 text-gray-400">{row.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* JSON schema preview */}
      {fieldSchemaRows.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">JSON Schema Preview</p>
          <pre className="px-4 py-3 bg-gray-800 rounded-lg text-xs font-mono text-green-400 overflow-x-auto whitespace-pre max-h-[300px] overflow-y-auto">
            {JSON.stringify(jsonSchemaPreview, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared: Status indicator                                           */
/* ------------------------------------------------------------------ */

function StatusIndicator({ pass }: { pass: boolean | null }) {
  if (pass === null) {
    return <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-600" title="Not checked" />;
  }
  return pass ? (
    <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" title="Pass" />
  ) : (
    <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" title="Fail" />
  );
}
