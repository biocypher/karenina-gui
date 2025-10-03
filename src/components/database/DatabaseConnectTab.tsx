import React, { useState } from 'react';
import { Database, FolderOpen, Loader, CheckCircle, AlertCircle } from 'lucide-react';

interface DatabaseConnectTabProps {
  onConnect: (storageUrl: string) => void;
}

export const DatabaseConnectTab: React.FC<DatabaseConnectTabProps> = ({ onConnect }) => {
  const [storageUrl, setStorageUrl] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'error'>('idle');
  const [benchmarkCount, setBenchmarkCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const handleBrowse = () => {
    // Create a file input element for SQLite database file selection
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.db,.sqlite,.sqlite3';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Use file path or name for SQLite URL
        setStorageUrl(`sqlite:///${file.name}`);
      }
    };
    input.click();
  };

  const handleCreateNew = async () => {
    if (!storageUrl.trim()) {
      setErrorMessage('Please enter a database URL');
      return;
    }

    setIsConnecting(true);
    setErrorMessage('');
    setConnectionStatus('idle');

    try {
      // Create new database
      const response = await fetch('/api/database/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_url: storageUrl.trim(),
          create_if_missing: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create database');
      }

      const data = await response.json();
      setBenchmarkCount(data.benchmark_count);
      setConnectionStatus('connected');

      // Notify parent component
      onConnect(storageUrl.trim());
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create database');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectExisting = async () => {
    if (!storageUrl.trim()) {
      setErrorMessage('Please enter a database URL');
      return;
    }

    setIsConnecting(true);
    setErrorMessage('');
    setConnectionStatus('idle');

    try {
      // Connect to existing database
      const response = await fetch('/api/database/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_url: storageUrl.trim(),
          create_if_missing: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to connect to database');
      }

      const data = await response.json();
      setBenchmarkCount(data.benchmark_count);
      setConnectionStatus('connected');

      // Notify parent component
      onConnect(storageUrl.trim());
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to connect to database');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Database URL Input */}
      <div>
        <label htmlFor="storage-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Database URL
        </label>
        <div className="flex gap-2">
          <input
            id="storage-url"
            type="text"
            value={storageUrl}
            onChange={(e) => setStorageUrl(e.target.value)}
            placeholder="sqlite:///path/to/database.db or postgresql://..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            disabled={isConnecting || connectionStatus === 'connected'}
          />
          <button
            onClick={handleBrowse}
            disabled={isConnecting || connectionStatus === 'connected'}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300
                     rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
            title="Browse for SQLite database file"
          >
            <FolderOpen className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      {connectionStatus !== 'connected' && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleCreateNew}
            disabled={isConnecting || !storageUrl.trim()}
            className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700
                     text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                     disabled:transform-none"
          >
            {isConnecting ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Database className="h-5 w-5" />
                Create New Database
              </>
            )}
          </button>

          <button
            onClick={handleConnectExisting}
            disabled={isConnecting || !storageUrl.trim()}
            className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700
                     text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                     disabled:transform-none"
          >
            {isConnecting ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Database className="h-5 w-5" />
                Connect to Existing
              </>
            )}
          </button>
        </div>
      )}

      {/* Connection Status */}
      {connectionStatus === 'connected' && (
        <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900 dark:text-green-100">Connected successfully!</p>
            <p className="text-sm text-green-700 dark:text-green-300">
              Found {benchmarkCount} benchmark{benchmarkCount !== 1 ? 's' : ''} in database
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && connectionStatus === 'error' && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
        </div>
      )}

      {/* Help Text */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Database URL Examples</h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>
            <code className="bg-blue-100 dark:bg-blue-800 px-2 py-0.5 rounded">sqlite:///path/to/database.db</code>
          </li>
          <li>
            <code className="bg-blue-100 dark:bg-blue-800 px-2 py-0.5 rounded">
              postgresql://user:password@localhost:5432/database
            </code>
          </li>
        </ul>
      </div>
    </div>
  );
};
