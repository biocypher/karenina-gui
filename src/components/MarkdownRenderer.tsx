import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../hooks/useTheme';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Reusable MarkdownRenderer component with custom styling and syntax highlighting.
 * Extracted from DocsTab.tsx to enable consistent markdown rendering across the application.
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  const { theme } = useTheme();

  return (
    <div className={`prose prose-slate dark:prose-invert max-w-none ${className || ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom components for better styling
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4 mt-6">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-3 mt-5">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-4">{children}</h3>
          ),
          p: ({ children }) => <p className="text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">{children}</p>,
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
            <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 mb-4 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside text-slate-700 dark:text-slate-300 mb-4 space-y-1">{children}</ol>
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
              <table className="min-w-full divide-y divide-slate-300 dark:divide-slate-600">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-slate-50 dark:bg-slate-800">{children}</thead>,
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">{children}</tbody>
          ),
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">{children}</th>
          ),
          td: ({ children }) => <td className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
