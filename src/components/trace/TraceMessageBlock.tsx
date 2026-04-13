import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { TraceMessage } from '../../types/trace';
import { TraceToolCallBlock } from './TraceToolCallBlock';
import { TraceToolResultBlock } from './TraceToolResultBlock';
import { TraceThinkingBlock } from './TraceThinkingBlock';

interface TraceMessageBlockProps {
  message: TraceMessage;
  searchQuery?: string;
  isCurrentMatch?: boolean;
  isCurrentTurn?: boolean;
  collapsible?: boolean;
}

const ROLE_STYLES: Record<string, { bg: string; badge: string; label: string }> = {
  assistant: {
    bg: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800',
    badge: 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200',
    label: 'Assistant',
  },
  tool: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800',
    badge: 'bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200',
    label: 'Tool',
  },
  user: {
    bg: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800',
    badge: 'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200',
    label: 'User',
  },
  system: {
    bg: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
    badge: 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200',
    label: 'System',
  },
};

/**
 * Recursively walk React children and wrap text matches in <mark> tags.
 */
function highlightChildren(children: React.ReactNode, query: string): React.ReactNode {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');

  function walk(node: React.ReactNode): React.ReactNode {
    if (typeof node === 'string') {
      const parts = node.split(regex);
      if (parts.length === 1) return node;
      return parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-600/50 text-inherit rounded-sm px-px">
            {part}
          </mark>
        ) : (
          part
        )
      );
    }
    if (Array.isArray(node)) {
      return node.map((child, i) => <React.Fragment key={i}>{walk(child)}</React.Fragment>);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (React.isValidElement(node) && (node.props as any).children != null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return React.cloneElement(node as React.ReactElement<any>, {}, walk((node.props as any).children));
    }
    return node;
  }

  return walk(children);
}

function buildMarkdownComponents(searchQuery?: string) {
  const hl = (children: React.ReactNode) => (searchQuery ? highlightChildren(children, searchQuery) : children);

  return {
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1.5 mt-3 first:mt-0">{hl(children)}</h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1 mt-2.5 first:mt-0">{hl(children)}</h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1 mt-2 first:mt-0">{hl(children)}</h3>
    ),
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className="mb-2 last:mb-0 leading-relaxed">{hl(children)}</p>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="list-disc list-inside mb-2 last:mb-0 space-y-0.5 ml-1">{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="list-decimal list-inside mb-2 last:mb-0 space-y-0.5 ml-1">{children}</ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => <li className="ml-2">{hl(children)}</li>,
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-semibold text-slate-900 dark:text-slate-100">{children}</strong>
    ),
    em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        {hl(children)}
      </a>
    ),
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="border-l-2 border-slate-300 dark:border-slate-600 pl-3 text-slate-600 dark:text-slate-400 italic my-2">
        {children}
      </blockquote>
    ),
    code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
      const isBlock = className?.startsWith('language-');
      if (isBlock) {
        return (
          <pre className="bg-slate-100 dark:bg-slate-800 rounded px-3 py-2 my-2 overflow-x-auto text-xs font-mono">
            <code>{hl(children)}</code>
          </pre>
        );
      }
      return (
        <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 rounded text-xs font-mono">
          {hl(children)}
        </code>
      );
    },
    pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    table: ({ children }: { children?: React.ReactNode }) => (
      <div className="overflow-x-auto my-2">
        <table className="min-w-full text-xs divide-y divide-slate-300 dark:divide-slate-600">{children}</table>
      </div>
    ),
    thead: ({ children }: { children?: React.ReactNode }) => (
      <thead className="bg-slate-100 dark:bg-slate-800">{children}</thead>
    ),
    tbody: ({ children }: { children?: React.ReactNode }) => (
      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">{children}</tbody>
    ),
    th: ({ children }: { children?: React.ReactNode }) => (
      <th className="px-2 py-1 text-left font-semibold">{hl(children)}</th>
    ),
    td: ({ children }: { children?: React.ReactNode }) => <td className="px-2 py-1">{hl(children)}</td>,
    hr: () => <hr className="border-slate-200 dark:border-slate-700 my-2" />,
  };
}

export const TraceMessageBlock: React.FC<TraceMessageBlockProps> = ({
  message,
  searchQuery,
  isCurrentMatch,
  isCurrentTurn,
  collapsible,
}) => {
  const [collapsed, setCollapsed] = React.useState(true);
  const style = ROLE_STYLES[message.role] || ROLE_STYLES.system;
  const components = useMemo(() => buildMarkdownComponents(searchQuery), [searchQuery]);

  const ringClass = isCurrentMatch ? 'ring-2 ring-yellow-400 dark:ring-yellow-500' : '';
  const turnClass = isCurrentTurn ? 'border-l-[3px] border-l-teal-500' : '';
  const isCollapsible = collapsible && message.role === 'system';

  const contentPreview =
    isCollapsible && collapsed && message.content
      ? message.content.slice(0, 150) + (message.content.length > 150 ? '...' : '')
      : null;

  return (
    <div className={`rounded-lg border p-3 ${style.bg} ${ringClass} ${turnClass} transition-shadow`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${style.badge}`}>{style.label}</span>
        {isCurrentTurn && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300">
            Current Turn
          </span>
        )}
        {message._isInjected && <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">injected</span>}
        {message.model && <span className="text-[10px] text-slate-400 dark:text-slate-500">{message.model}</span>}
      </div>

      {/* Thinking block (SDK extended thinking) */}
      {message.thinking && <TraceThinkingBlock thinking={message.thinking} />}

      {/* Collapsible system message */}
      {isCollapsible ? (
        <div className="mt-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-xs text-slate-500 dark:text-slate-400 hover:underline flex items-center gap-1"
          >
            <span>{collapsed ? '\u25B6' : '\u25BC'}</span>
            <span>{collapsed ? 'Show system prompt' : 'Hide system prompt'}</span>
          </button>
          {collapsed && contentPreview && (
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">{contentPreview}</div>
          )}
          {!collapsed && message.content && (
            <div className="text-sm text-slate-800 dark:text-slate-200 mt-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      ) : message.role === 'tool' && message.tool_result ? (
        /* Tool result (for tool messages, rendered instead of generic content to avoid duplication) */
        <TraceToolResultBlock content={message.content} toolResult={message.tool_result} />
      ) : (
        <>
          {/* Text content (non-tool messages), rendered as markdown */}
          {message.content && (
            <div className="text-sm text-slate-800 dark:text-slate-200 mt-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Tool calls */}
          {message.tool_calls && message.tool_calls.length > 0 && <TraceToolCallBlock toolCalls={message.tool_calls} />}
        </>
      )}
    </div>
  );
};
