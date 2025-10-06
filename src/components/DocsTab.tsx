import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

// Import markdown files as raw strings
import kareninaFrameworkMd from '../../docs/karenina_framework.md?raw';
import generalConfigsMd from '../../docs/general_configs.md?raw';
import generationTabMd from '../../docs/generation_tab.md?raw';
import curationTabMd from '../../docs/curation_tab.md?raw';
import benchmarkingTabMd from '../../docs/benchmarking_tab.md?raw';

interface DocSection {
  id: string;
  title: string;
  content: string;
}

const docSections: DocSection[] = [
  {
    id: 'karenina-framework',
    title: 'The Karenina Framework',
    content: kareninaFrameworkMd,
  },
  {
    id: 'general-configs',
    title: 'General Configurations',
    content: generalConfigsMd,
  },
  {
    id: 'generation-tab',
    title: 'Template Generation',
    content: generationTabMd,
  },
  {
    id: 'curation-tab',
    title: 'Template Curation',
    content: curationTabMd,
  },
  {
    id: 'benchmarking-tab',
    title: 'Benchmarking',
    content: benchmarkingTabMd,
  },
];

export const DocsTab: React.FC = () => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['karenina-framework']));
  const { theme } = useTheme();

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <BookOpen className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-800 via-blue-900 to-indigo-900 dark:from-slate-200 dark:via-blue-300 dark:to-indigo-300 bg-clip-text text-transparent">
            Documentation
          </h2>
        </div>
        <p className="text-slate-600 dark:text-slate-300 text-lg">
          Comprehensive guide to using the Karenina benchmarking system
        </p>
      </div>

      {/* Documentation Sections */}
      <div className="space-y-4">
        {docSections.map((section) => {
          const isExpanded = expandedSections.has(section.id);

          return (
            <div
              key={section.id}
              className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 overflow-hidden transition-all duration-200"
            >
              {/* Section Header - Clickable */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-indigo-600 dark:text-indigo-400 transition-transform" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-500 dark:text-slate-400 transition-transform" />
                  )}
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{section.title}</h3>
                </div>
              </button>

              {/* Section Content - Collapsible */}
              {isExpanded && (
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // Custom components for better styling
                        h1: ({ children }) => (
                          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4 mt-6">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-3 mt-5">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-4">
                            {children}
                          </h3>
                        ),
                        p: ({ children }) => (
                          <p className="text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">{children}</p>
                        ),
                        code: ({ className, children }) => {
                          const isInline = !className;
                          if (isInline) {
                            return (
                              <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 rounded text-sm font-mono">
                                {children}
                              </code>
                            );
                          }
                          // Extract language from className (format: language-xxx)
                          const match = /language-(\w+)/.exec(className || '');
                          const language = match ? match[1] : 'text';

                          return (
                            <SyntaxHighlighter
                              style={theme === 'dark' ? vscDarkPlus : vs}
                              language={language}
                              PreTag="div"
                              className="rounded-lg mb-4 text-sm"
                              customStyle={{
                                margin: 0,
                                borderRadius: '0.5rem',
                              }}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          );
                        },
                        pre: ({ children }) => <>{children}</>,
                        ul: ({ children }) => (
                          <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 mb-4 space-y-1">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal list-inside text-slate-700 dark:text-slate-300 mb-4 space-y-1">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => <li className="ml-4">{children}</li>,
                        a: ({ href, children }) => (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {children}
                          </a>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-indigo-500 dark:border-indigo-400 pl-4 italic text-slate-600 dark:text-slate-400 my-4">
                            {children}
                          </blockquote>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold text-slate-900 dark:text-slate-100">{children}</strong>
                        ),
                        em: ({ children }) => <em className="italic">{children}</em>,
                        table: ({ children }) => (
                          <div className="overflow-x-auto mb-4">
                            <table className="min-w-full divide-y divide-slate-300 dark:divide-slate-600">
                              {children}
                            </table>
                          </div>
                        ),
                        thead: ({ children }) => <thead className="bg-slate-50 dark:bg-slate-800">{children}</thead>,
                        tbody: ({ children }) => (
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">{children}</tbody>
                        ),
                        tr: ({ children }) => <tr>{children}</tr>,
                        th: ({ children }) => (
                          <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300">{children}</td>
                        ),
                      }}
                    >
                      {section.content}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Note */}
      <div className="mt-8 p-4 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
        <p className="text-sm text-blue-800 dark:text-blue-300 text-center">
          💡 <strong>Tip:</strong> Click on any section header to expand or collapse its content. All documentation is
          embedded in the application for offline access.
        </p>
      </div>
    </div>
  );
};
