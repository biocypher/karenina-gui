import React from 'react';
import { Search, CheckSquare, Square } from 'lucide-react';
import type { MCPTool } from '../../../types';

// ============================================================================
// Props
// ============================================================================

export interface MCPToolsProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredTools: MCPTool[];
  selectedTools: Set<string>;
  selectedCount: number;
  totalTools: number;
  availableTools: number;
  onToggleTool: (toolName: string) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
}

// ============================================================================
// Tool Item Component
// ============================================================================

interface ToolItemProps {
  tool: MCPTool;
  isSelected: boolean;
  onToggle: () => void;
}

const ToolItem: React.FC<ToolItemProps> = ({ tool, isSelected, onToggle }) => {
  return (
    <div className="group relative">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-blue-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 blur-sm"></div>
      <div className="relative flex items-start space-x-3 p-3 hover:bg-white/60 dark:hover:bg-slate-800/60 rounded-lg transition-all duration-200 backdrop-blur-sm border border-transparent group-hover:border-slate-200/50 dark:group-hover:border-slate-600/50">
        <button onClick={onToggle} className="mt-0.5 group/checkbox">
          {isSelected ? (
            <div className="relative">
              <CheckSquare className="w-5 h-5 text-purple-500 group-hover/checkbox:text-purple-600 transition-colors" />
              <div className="absolute inset-0 bg-purple-500/20 rounded-sm animate-pulse"></div>
            </div>
          ) : (
            <Square className="w-5 h-5 text-slate-400 group-hover/checkbox:text-slate-600 dark:group-hover/checkbox:text-slate-300 transition-colors" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-900 dark:text-slate-100 group-hover:text-purple-900 dark:group-hover:text-purple-100 transition-colors">
            {tool.name}
          </div>
          {tool.description && (
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{tool.description}</div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Component
// ============================================================================

export const MCPTools: React.FC<MCPToolsProps> = ({
  searchTerm,
  setSearchTerm,
  filteredTools,
  selectedTools,
  selectedCount,
  totalTools,
  availableTools,
  onToggleTool,
  onSelectAll,
  onSelectNone,
}) => {
  if (totalTools === 0 && selectedTools.size === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center space-x-2 mb-4">
        <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Available Tools</h3>
        <div className="flex-1 h-px bg-gradient-to-r from-slate-300/50 to-transparent dark:from-slate-600/50"></div>
        <div className="px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border border-purple-200 dark:border-purple-700 rounded-full text-xs font-medium text-purple-700 dark:text-purple-300">
          {availableTools} available
          {totalTools > availableTools ? `, ${totalTools - availableTools} previously selected` : ''}
        </div>
      </div>

      <div className="border border-slate-200/60 dark:border-slate-600/60 rounded-xl p-4 bg-gradient-to-br from-white/50 to-slate-50/50 dark:from-slate-800/50 dark:to-slate-900/50 backdrop-blur-sm shadow-sm">
        {/* Search and controls */}
        <div className="mb-3">
          <div className="flex items-center space-x-3 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search tools by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white/80 dark:bg-slate-700/80 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all duration-200 backdrop-blur-sm"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onSelectAll}
              className="px-4 py-2 text-sm bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 font-medium"
            >
              Select All
            </button>
            <button
              onClick={onSelectNone}
              className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 backdrop-blur-sm font-medium"
            >
              Select None
            </button>
          </div>
        </div>

        {/* Tools list */}
        <div className="max-h-64 overflow-y-auto space-y-2">
          {filteredTools.map((tool) => (
            <ToolItem
              key={tool.name}
              tool={tool}
              isSelected={selectedTools.has(tool.name)}
              onToggle={() => onToggleTool(tool.name)}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Selected: <span className="font-medium text-slate-700 dark:text-slate-300">{selectedCount}</span> of{' '}
          <span className="font-medium text-slate-700 dark:text-slate-300">{totalTools}</span> tools
        </div>
        {selectedCount > 0 && (
          <div className="px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border border-purple-200 dark:border-purple-700 rounded-full text-xs font-medium text-purple-700 dark:text-purple-300">
            {selectedCount} selected
          </div>
        )}
      </div>
    </div>
  );
};
