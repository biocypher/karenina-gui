import React from 'react';
import { Plus, Trash2, Loader2, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import type { MCPServer } from '../../../types';

// ============================================================================
// Props
// ============================================================================

export interface MCPServerListProps {
  servers: MCPServer[];
  isValidating: string | null;
  savingPresetForServer: number | null;
  onUpdateServer: (index: number, field: keyof MCPServer, value: string) => void;
  onValidateServer: (index: number) => void;
  onRemoveServer: (index: number) => void;
  onAddServer: () => void;
  onSavePreset: (index: number) => void;
  getPresetButtonLabel: (index: number) => string;
}

// ============================================================================
// Server Card Component
// ============================================================================

interface ServerCardProps {
  server: MCPServer;
  index: number;
  isValidating: string | null;
  savingPresetForServer: number | null;
  onUpdateServer: (index: number, field: keyof MCPServer, value: string) => void;
  onValidateServer: (index: number) => void;
  onRemoveServer: (index: number) => void;
  onSavePreset: (index: number) => void;
  getPresetButtonLabel: (index: number) => string;
}

const ServerCard: React.FC<ServerCardProps> = ({
  server,
  index,
  isValidating,
  savingPresetForServer,
  onUpdateServer,
  onValidateServer,
  onRemoveServer,
  onSavePreset,
  getPresetButtonLabel,
}) => {
  return (
    <div key={index} className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 via-purple-500/10 to-cyan-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-sm"></div>
      <div className="relative border border-slate-200/60 dark:border-slate-600/60 rounded-xl p-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all duration-200 shadow-sm hover:shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name:</label>
            <input
              type="text"
              value={server.name}
              onChange={(e) => onUpdateServer(index, 'name', e.target.value)}
              className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white/80 dark:bg-slate-700/80 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all duration-200 backdrop-blur-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL:</label>
            <input
              type="url"
              value={server.url}
              onChange={(e) => onUpdateServer(index, 'url', e.target.value)}
              className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white/80 dark:bg-slate-700/80 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all duration-200 backdrop-blur-sm"
              placeholder="https://mcp.example.com/mcp/"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onValidateServer(index)}
              disabled={!server.name || !server.url || isValidating === server.name}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg shadow-lg hover:shadow-xl disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed text-sm flex items-center space-x-2 transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
            >
              {isValidating === server.name ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span className="font-medium">Validate</span>
              )}
            </button>

            {/* Status indicator */}
            {server.status === 'valid' && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-700 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  Valid ({server.tools?.length || 0} tools)
                </span>
              </div>
            )}
            {server.status === 'invalid' && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-700 dark:text-red-300">Invalid</span>
              </div>
            )}
            {server.status === 'validating' && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Validating...</span>
              </div>
            )}

            {/* Save as Preset button */}
            {server.status === 'valid' && (
              <button
                onClick={() => onSavePreset(index)}
                disabled={savingPresetForServer === index}
                className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-lg shadow-lg hover:shadow-xl disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed text-sm flex items-center space-x-2 transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
              >
                {savingPresetForServer === index ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                <span className="font-medium">{getPresetButtonLabel(index)}</span>
              </button>
            )}
          </div>

          <button
            onClick={() => onRemoveServer(index)}
            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 group"
          >
            <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {server.error && (
          <div className="mt-3 p-3 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-300 backdrop-blur-sm">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 text-red-500" />
              <div>{server.error}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Component
// ============================================================================

export const MCPServerList: React.FC<MCPServerListProps> = ({
  servers,
  isValidating,
  savingPresetForServer,
  onUpdateServer,
  onValidateServer,
  onRemoveServer,
  onAddServer,
  onSavePreset,
  getPresetButtonLabel,
}) => {
  return (
    <div className="mb-8">
      <div className="flex items-center space-x-2 mb-4">
        <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">MCP Servers</h3>
        <div className="flex-1 h-px bg-gradient-to-r from-slate-300/50 to-transparent dark:from-slate-600/50"></div>
      </div>

      <div className="space-y-4">
        {servers.map((server, index) => (
          <ServerCard
            key={index}
            server={server}
            index={index}
            isValidating={isValidating}
            savingPresetForServer={savingPresetForServer}
            onUpdateServer={onUpdateServer}
            onValidateServer={onValidateServer}
            onRemoveServer={onRemoveServer}
            onSavePreset={onSavePreset}
            getPresetButtonLabel={getPresetButtonLabel}
          />
        ))}
      </div>

      <button
        onClick={onAddServer}
        className="mt-4 px-4 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 flex items-center justify-center space-x-2 transition-all duration-200 group backdrop-blur-sm"
      >
        <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
        <span className="font-medium">Add Server</span>
      </button>
    </div>
  );
};
