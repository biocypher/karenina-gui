import React, { useEffect, useRef, useState } from 'react';
import { GitCompare, Code, Undo2, Edit3, FileText } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';
import { DiffViewer } from './DiffViewer';
import { PydanticFormEditor } from './pydantic/PydanticFormEditor';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  originalCode?: string;
  savedCode?: string;
  enableFormEditor?: boolean; // Enable the dual-view Pydantic form editor
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  readOnly = false,
  originalCode = '',
  savedCode = '',
  enableFormEditor = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlightedCode, setHighlightedCode] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  const [diffMode, setDiffMode] = useState<'original' | 'saved'>('original');
  const [editorMode, setEditorMode] = useState<'code' | 'form'>('form');
  const [scrollInfo, setScrollInfo] = useState({
    scrollLeft: 0,
    scrollTop: 0,
    maxScrollLeft: 0,
    maxScrollTop: 0,
  });

  // Calculate line numbers
  const lineCount = Math.max(value.split('\n').length, 1);
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  // Determine which comparison to show
  const hasOriginal = originalCode && originalCode.trim() !== '';
  const hasSaved = savedCode && savedCode.trim() !== '';
  const hasChangesFromOriginal = hasOriginal && value !== originalCode;
  const hasChangesFromSaved = hasSaved && value !== savedCode;

  // Determine if revert button should be shown and what options are available
  const canRevert = hasChangesFromOriginal || hasChangesFromSaved;
  const revertOptions = {
    canRevertToOriginal: hasChangesFromOriginal,
    canRevertToSaved: hasChangesFromSaved,
    hasMultipleOptions: hasChangesFromOriginal && hasChangesFromSaved,
  };

  const handleRevert = (type: 'original' | 'saved') => {
    if (type === 'original' && hasOriginal) {
      onChange(originalCode);
    } else if (type === 'saved' && hasSaved) {
      onChange(savedCode);
    }
  };

  const revertToOriginal = () => handleRevert('original');
  const revertToSaved = () => handleRevert('saved');

  useEffect(() => {
    // Highlight the code using Prism
    try {
      const highlighted = Prism.highlight(value || '', Prism.languages.python, 'python');
      setHighlightedCode(highlighted);
    } catch (error) {
      console.error('Syntax highlighting error:', error);
      setHighlightedCode(value || '');
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + '    ' + value.substring(end);
      onChange(newValue);

      // Set cursor position after the inserted spaces
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
    }
  };

  const syncScroll = () => {
    if (textareaRef.current && preRef.current) {
      const textarea = textareaRef.current;
      preRef.current.scrollTop = textarea.scrollTop;
      preRef.current.scrollLeft = textarea.scrollLeft;

      // Update scroll info for custom scrollbars
      setScrollInfo({
        scrollLeft: textarea.scrollLeft,
        scrollTop: textarea.scrollTop,
        maxScrollLeft: Math.max(0, textarea.scrollWidth - textarea.clientWidth),
        maxScrollTop: Math.max(0, textarea.scrollHeight - textarea.clientHeight),
      });
    }
  };

  const handleHorizontalScroll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const scrollLeft = parseInt(e.target.value);
    if (textareaRef.current && preRef.current) {
      textareaRef.current.scrollLeft = scrollLeft;
      preRef.current.scrollLeft = scrollLeft;
      setScrollInfo((prev) => ({ ...prev, scrollLeft }));
    }
  };

  const handleVerticalScroll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const scrollTop = parseInt(e.target.value);
    if (textareaRef.current && preRef.current) {
      textareaRef.current.scrollTop = scrollTop;
      preRef.current.scrollTop = scrollTop;
      setScrollInfo((prev) => ({ ...prev, scrollTop }));
    }
  };

  const toggleDiff = () => {
    if (!showDiff) {
      // Determine which diff mode to use
      if (hasChangesFromSaved && hasSaved) {
        setDiffMode('saved');
      } else if (hasChangesFromOriginal && hasOriginal) {
        setDiffMode('original');
      }
    }
    setShowDiff(!showDiff);
  };

  const switchDiffMode = (mode: 'original' | 'saved') => {
    setDiffMode(mode);
  };

  // Update scroll info when content changes
  useEffect(() => {
    const updateScrollInfo = () => {
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        setScrollInfo({
          scrollLeft: textarea.scrollLeft,
          scrollTop: textarea.scrollTop,
          maxScrollLeft: Math.max(0, textarea.scrollWidth - textarea.clientWidth),
          maxScrollTop: Math.max(0, textarea.scrollHeight - textarea.clientHeight),
        });
      }
    };

    const timer = setTimeout(updateScrollInfo, 100);
    return () => clearTimeout(timer);
  }, [value]);

  // Determine if diff button should be shown
  const canShowDiff = hasChangesFromOriginal || hasChangesFromSaved;

  if (showDiff) {
    const compareCode = diffMode === 'saved' ? savedCode : originalCode;
    const compareTitle = diffMode === 'saved' ? 'Diff vs Last Saved' : 'Diff vs Original';

    return (
      <div className="w-full h-full flex flex-col">
        {/* Diff Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 border-b border-slate-300 dark:border-slate-600 flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleDiff}
              className="px-4 py-2 bg-slate-700 dark:bg-slate-600 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-slate-500 transition-colors flex items-center gap-2 text-sm font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Code className="w-4 h-4" />
              Back to Editor
            </button>

            {/* Diff Mode Switcher */}
            {hasChangesFromOriginal && hasChangesFromSaved && (
              <div className="flex bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-600 overflow-hidden shadow-sm">
                <button
                  onClick={() => switchDiffMode('original')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    diffMode === 'original'
                      ? 'bg-indigo-600 dark:bg-indigo-700 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  vs Original
                </button>
                <button
                  onClick={() => switchDiffMode('saved')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    diffMode === 'saved'
                      ? 'bg-indigo-600 dark:bg-indigo-700 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  vs Saved
                </button>
              </div>
            )}
          </div>

          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{compareTitle}</div>
        </div>

        {/* Diff Content */}
        <div className="flex-1 min-h-0">
          <DiffViewer originalCode={compareCode} currentCode={value} title={compareTitle} hideHeader={true} />
        </div>
      </div>
    );
  }

  // Form Editor View
  if (enableFormEditor && editorMode === 'form') {
    return (
      <div className="w-full h-full flex flex-col">
        {/* Form Editor Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 border-b border-slate-300 dark:border-slate-600 flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditorMode('code')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <FileText className="w-4 h-4" />
              Code Editor
            </button>

            {canRevert && (
              <div className="relative">
                {revertOptions.hasMultipleOptions ? (
                  <div className="flex bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-600 overflow-hidden shadow-sm">
                    <button
                      onClick={revertToOriginal}
                      className="px-3 py-2 text-xs font-medium bg-slate-600 text-white hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                      title="Revert to original template"
                    >
                      <Undo2 className="w-3 h-3" />
                      Revert to Original
                    </button>
                    <button
                      onClick={revertToSaved}
                      className="px-3 py-2 text-xs font-medium bg-slate-600 text-white hover:bg-slate-700 transition-colors flex items-center gap-1.5 border-l border-slate-500"
                      title="Revert to last saved version"
                    >
                      <Undo2 className="w-3 h-3" />
                      Revert to Saved
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={revertOptions.canRevertToSaved ? revertToSaved : revertToOriginal}
                    className="px-4 py-2 bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    title={
                      revertOptions.canRevertToSaved ? 'Revert to last saved version' : 'Revert to original template'
                    }
                  >
                    <Undo2 className="w-4 h-4" />
                    Revert
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Form Editor - Visual Pydantic Builder
          </div>
        </div>

        {/* Form Editor Content */}
        <div className="flex-1 min-h-0 bg-gray-50 dark:bg-gray-900">
          <PydanticFormEditor code={value} onChange={onChange} className="h-full overflow-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full border border-slate-300 rounded-2xl overflow-hidden bg-slate-900 shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          {enableFormEditor && (
            <button
              onClick={() => setEditorMode('form')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Edit3 className="w-4 h-4" />
              Form Editor
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {canShowDiff && (
            <button
              onClick={toggleDiff}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <GitCompare className="w-4 h-4" />
              Show Diff
            </button>
          )}

          {canRevert && (
            <div className="relative">
              {revertOptions.hasMultipleOptions ? (
                <div className="flex bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-600 overflow-hidden shadow-sm">
                  <button
                    onClick={revertToOriginal}
                    className="px-3 py-2 text-xs font-medium bg-slate-600 text-white hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                    title="Revert to original template"
                  >
                    <Undo2 className="w-3 h-3" />
                    Revert to Original
                  </button>
                  <button
                    onClick={revertToSaved}
                    className="px-3 py-2 text-xs font-medium bg-slate-600 text-white hover:bg-slate-700 transition-colors flex items-center gap-1.5 border-l border-slate-500"
                    title="Revert to last saved version"
                  >
                    <Undo2 className="w-3 h-3" />
                    Revert to Saved
                  </button>
                </div>
              ) : (
                <button
                  onClick={revertOptions.canRevertToSaved ? revertToSaved : revertToOriginal}
                  className="px-4 py-2 bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  title={
                    revertOptions.canRevertToSaved ? 'Revert to last saved version' : 'Revert to original template'
                  }
                >
                  <Undo2 className="w-4 h-4" />
                  Revert
                </button>
              )}
            </div>
          )}

          <div className="text-xs text-slate-400 font-mono font-semibold">Python</div>
        </div>
      </div>

      {/* Editor Container */}
      <div ref={containerRef} className="relative flex flex-1 min-h-0">
        {/* Line Numbers */}
        <div className="flex-shrink-0 bg-slate-800 text-slate-500 text-sm font-mono leading-6 px-3 py-4 select-none border-r border-slate-700 overflow-hidden">
          <div>
            {lineNumbers.map((num) => (
              <div key={num} className="text-right min-w-[2.5rem] h-6 font-semibold">
                {num}
              </div>
            ))}
          </div>
        </div>

        {/* Code Area */}
        <div className="relative flex-1 min-w-0">
          {/* Syntax Highlighted Code (Background) */}
          <pre
            ref={preRef}
            className="absolute inset-0 p-4 m-0 text-sm font-mono leading-6 pointer-events-none text-white bg-transparent"
            style={{
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", "Consolas", "source-code-pro", monospace',
              overflow: 'hidden',
              whiteSpace: 'pre',
              wordWrap: 'normal',
            }}
          >
            <code className="language-python" dangerouslySetInnerHTML={{ __html: highlightedCode }} />
          </pre>

          {/* Textarea (Foreground) */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={syncScroll}
            onKeyDown={handleKeyDown}
            readOnly={readOnly}
            placeholder={readOnly ? '' : 'Enter your Pydantic class definition here...'}
            className={`absolute inset-0 w-full h-full p-4 text-sm font-mono leading-6 bg-transparent resize-none border-none outline-none text-white caret-white selection:bg-indigo-600 selection:bg-opacity-40 ${
              readOnly ? 'cursor-default' : 'cursor-text'
            }`}
            style={{
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", "Consolas", "source-code-pro", monospace',
              color: 'rgba(255, 255, 255, 0.01)',
              textShadow: 'none',
              WebkitTextFillColor: 'rgba(255, 255, 255, 0.01)',
              overflow: 'auto',
              whiteSpace: 'pre',
              wordWrap: 'normal',
              overflowWrap: 'normal',
            }}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            data-gramm="false"
            wrap="off"
          />
        </div>
      </div>

      {/* Custom Scrollbars */}
      <div className="flex-shrink-0 bg-slate-800 border-t border-slate-700">
        {/* Horizontal Scrollbar */}
        {scrollInfo.maxScrollLeft > 0 && (
          <div className="px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono min-w-[3rem] font-semibold">H-Scroll</span>
              <input
                type="range"
                min="0"
                max={scrollInfo.maxScrollLeft}
                value={scrollInfo.scrollLeft}
                onChange={handleHorizontalScroll}
                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-horizontal"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(scrollInfo.scrollLeft / scrollInfo.maxScrollLeft) * 100}%, #374151 ${(scrollInfo.scrollLeft / scrollInfo.maxScrollLeft) * 100}%, #374151 100%)`,
                }}
              />
              <span className="text-xs text-slate-400 font-mono min-w-[4rem] text-right font-semibold">
                {Math.round((scrollInfo.scrollLeft / scrollInfo.maxScrollLeft) * 100) || 0}%
              </span>
            </div>
          </div>
        )}

        {/* Vertical Scrollbar */}
        {scrollInfo.maxScrollTop > 0 && (
          <div className="px-4 py-2 border-t border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono min-w-[3rem] font-semibold">V-Scroll</span>
              <input
                type="range"
                min="0"
                max={scrollInfo.maxScrollTop}
                value={scrollInfo.scrollTop}
                onChange={handleVerticalScroll}
                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-vertical"
                style={{
                  background: `linear-gradient(to right, #10b981 0%, #10b981 ${(scrollInfo.scrollTop / scrollInfo.maxScrollTop) * 100}%, #374151 ${(scrollInfo.scrollTop / scrollInfo.maxScrollTop) * 100}%, #374151 100%)`,
                }}
              />
              <span className="text-xs text-slate-400 font-mono min-w-[4rem] text-right font-semibold">
                {Math.round((scrollInfo.scrollTop / scrollInfo.maxScrollTop) * 100) || 0}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-t border-slate-700 text-xs text-slate-400 flex-shrink-0">
        <div className="flex items-center gap-4 font-semibold">
          <span>Lines: {lineCount}</span>
          <span>Characters: {value.length}</span>
          <span>Words: {value.trim() ? value.trim().split(/\s+/).length : 0}</span>
        </div>
        <div className="flex items-center gap-2 font-semibold">
          <span>UTF-8</span>
          <span>•</span>
          <span>Python</span>
          {!readOnly && <span>• Editable</span>}
        </div>
      </div>
    </div>
  );
};
