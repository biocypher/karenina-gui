import React from 'react';
import { Zap, AlertCircle } from 'lucide-react';
import type { MCPPresetConfig } from '../../../types';

// ============================================================================
// Props
// ============================================================================

export interface MCPQuickConfigurationProps {
  presetConfigs: Record<string, MCPPresetConfig>;
  presetError: string | null;
  onAddPresetServer: (presetConfig: MCPPresetConfig) => void;
}

// ============================================================================
// Component
// ============================================================================

export const MCPQuickConfiguration: React.FC<MCPQuickConfigurationProps> = ({
  presetConfigs,
  presetError,
  onAddPresetServer,
}) => {
  if (Object.keys(presetConfigs).length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="flex items-center space-x-2 mb-4">
        <div className="w-1 h-6 bg-gradient-to-b from-yellow-500 to-orange-500 rounded-full"></div>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Quick Configuration</h3>
        <div className="flex-1 h-px bg-gradient-to-r from-slate-300/50 to-transparent dark:from-slate-600/50"></div>
        <div className="px-3 py-1 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 border border-yellow-200 dark:border-yellow-700 rounded-full text-xs font-medium text-yellow-700 dark:text-yellow-300">
          {Object.keys(presetConfigs).length} available
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {Object.values(presetConfigs).map((preset) => (
          <button
            key={preset.name}
            onClick={() => onAddPresetServer(preset)}
            className="group relative p-4 border border-slate-200/60 dark:border-slate-600/60 rounded-xl bg-gradient-to-br from-yellow-50/50 to-orange-50/50 dark:from-yellow-900/20 dark:to-orange-900/20 hover:from-yellow-100/80 dark:hover:from-yellow-800/40 hover:to-orange-100/80 dark:hover:to-orange-800/40 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md text-left"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500/20 via-orange-500/10 to-yellow-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-sm"></div>
            <div className="relative">
              <div className="flex items-start space-x-3 mb-2">
                <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg shadow-lg">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 dark:text-slate-100 group-hover:text-yellow-900 dark:group-hover:text-yellow-100 transition-colors truncate">
                    {preset.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{preset.url}</div>
                </div>
              </div>
              {preset.tools && preset.tools.length > 0 && (
                <div className="flex items-center space-x-1">
                  <div className="text-xs text-slate-600 dark:text-slate-400">{preset.tools.length} specific tools</div>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {presetError && (
        <div className="mb-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg text-sm text-yellow-700 dark:text-yellow-300 backdrop-blur-sm">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 mt-0.5 text-yellow-500" />
            <div>{presetError}</div>
          </div>
        </div>
      )}
    </div>
  );
};
