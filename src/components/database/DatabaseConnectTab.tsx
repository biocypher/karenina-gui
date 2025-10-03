import React, { useState, useEffect } from 'react';
import { Database, FolderOpen, Folder, Loader, CheckCircle, AlertCircle } from 'lucide-react';

interface DatabaseConnectTabProps {
  onConnect: (storageUrl: string) => void;
}

type DatabaseType = 'sqlite' | 'postgresql' | 'mysql';

export const DatabaseConnectTab: React.FC<DatabaseConnectTabProps> = ({ onConnect }) => {
  const [dbType, setDbType] = useState<DatabaseType>('sqlite');
  const [storageUrl, setStorageUrl] = useState('');

  // SQLite fields
  const [sqlitePath, setSqlitePath] = useState('');

  // PostgreSQL/MySQL fields
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('5432');
  const [database, setDatabase] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'error'>('idle');
  const [benchmarkCount, setBenchmarkCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  // Update storage URL when fields change
  useEffect(() => {
    let url = '';
    switch (dbType) {
      case 'sqlite':
        url = sqlitePath ? `sqlite:///${sqlitePath}` : '';
        break;
      case 'postgresql':
        if (host && database) {
          const auth = username ? `${username}${password ? `:${password}` : ''}@` : '';
          url = `postgresql://${auth}${host}:${port}/${database}`;
        }
        break;
      case 'mysql':
        if (host && database) {
          const auth = username ? `${username}${password ? `:${password}` : ''}@` : '';
          url = `mysql://${auth}${host}:${port}/${database}`;
        }
        break;
    }
    setStorageUrl(url);
  }, [dbType, sqlitePath, host, port, database, username, password]);

  // Reset fields when database type changes
  useEffect(() => {
    setSqlitePath('');
    setHost('localhost');
    setPort(dbType === 'postgresql' ? '5432' : '3306');
    setDatabase('');
    setUsername('');
    setPassword('');
    setConnectionStatus('idle');
    setErrorMessage('');
  }, [dbType]);

  const handleBrowseFile = () => {
    // Create a file input element for SQLite database file selection
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.db,.sqlite,.sqlite3';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Use file path or name for SQLite URL
        setSqlitePath(file.name);
      }
    };
    input.click();
  };

  const handleBrowseFolder = () => {
    // Create a file input element configured for directory selection
    const input = document.createElement('input');
    input.type = 'file';
    // @ts-expect-error - webkitdirectory is not in TypeScript types but works in modern browsers
    input.webkitdirectory = true;
    input.onchange = (e: Event) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        // Get the directory path from the first file
        const file = files[0];
        const pathParts = file.webkitRelativePath.split('/');
        const dirName = pathParts[0];

        // Prompt for database filename
        const filename = prompt('Enter database filename (without extension):', 'my_database');
        if (filename) {
          const dbFilename = filename.endsWith('.db') ? filename : `${filename}.db`;
          setSqlitePath(`${dirName}/${dbFilename}`);
        }
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
      {/* SQLite Fields with inline Database Type selector */}
      {dbType === 'sqlite' && (
        <div>
          <label htmlFor="sqlite-path" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Database Connection
          </label>
          <div className="flex gap-2">
            <select
              id="db-type"
              value={dbType}
              onChange={(e) => setDbType(e.target.value as DatabaseType)}
              className="w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={isConnecting || connectionStatus === 'connected'}
            >
              <option value="sqlite">SQLite</option>
              <option value="postgresql">PostgreSQL</option>
              <option value="mysql">MySQL</option>
            </select>
            <input
              id="sqlite-path"
              type="text"
              value={sqlitePath}
              onChange={(e) => setSqlitePath(e.target.value)}
              placeholder="/path/to/database.db"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={isConnecting || connectionStatus === 'connected'}
            />
            <button
              onClick={handleBrowseFile}
              disabled={isConnecting || connectionStatus === 'connected'}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300
                       rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
              title="Browse for existing database file"
            >
              <FolderOpen className="h-5 w-5" />
            </button>
            <button
              onClick={handleBrowseFolder}
              disabled={isConnecting || connectionStatus === 'connected'}
              className="px-4 py-2 bg-blue-100 dark:bg-blue-700 text-blue-700 dark:text-blue-300
                       rounded-md hover:bg-blue-200 dark:hover:bg-blue-600 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
              title="Browse for folder to create new database"
            >
              <Folder className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* PostgreSQL/MySQL Fields */}
      {(dbType === 'postgresql' || dbType === 'mysql') && (
        <div className="space-y-4">
          {/* Database Type selector inline with first row */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Database Connection
            </label>
            <div className="flex gap-4">
              <div className="w-40">
                <select
                  id="db-type"
                  value={dbType}
                  onChange={(e) => setDbType(e.target.value as DatabaseType)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  disabled={isConnecting || connectionStatus === 'connected'}
                >
                  <option value="sqlite">SQLite</option>
                  <option value="postgresql">PostgreSQL</option>
                  <option value="mysql">MySQL</option>
                </select>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div>
                  <input
                    id="host"
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="localhost"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    disabled={isConnecting || connectionStatus === 'connected'}
                  />
                  <label htmlFor="host" className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Host
                  </label>
                </div>
                <div>
                  <input
                    id="port"
                    type="text"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder={dbType === 'postgresql' ? '5432' : '3306'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    disabled={isConnecting || connectionStatus === 'connected'}
                  />
                  <label htmlFor="port" className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Port
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="database" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Database Name
            </label>
            <input
              id="database"
              type="text"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              placeholder="mydatabase"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={isConnecting || connectionStatus === 'connected'}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="user"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={isConnecting || connectionStatus === 'connected'}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={isConnecting || connectionStatus === 'connected'}
              />
            </div>
          </div>
        </div>
      )}

      {/* Generated URL Preview */}
      {storageUrl && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Generated Connection URL:</p>
          <code className="text-sm text-gray-700 dark:text-gray-300 break-all">{storageUrl}</code>
        </div>
      )}

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
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Connection Guide</h4>
        <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
          {dbType === 'sqlite' && (
            <>
              <p>
                <strong>SQLite:</strong> Use the file icon (
                <FolderOpen className="inline h-3 w-3" />) to select an existing database file, or the folder icon (
                <Folder className="inline h-3 w-3" />) to choose a directory for creating a new database.
              </p>
              <p className="text-xs">Example: /path/to/database.db or ./my_database.db</p>
            </>
          )}
          {dbType === 'postgresql' && (
            <>
              <p>
                <strong>PostgreSQL:</strong> Enter your PostgreSQL server connection details. The database must be
                accessible from this machine.
              </p>
              <p className="text-xs">Default port is 5432</p>
            </>
          )}
          {dbType === 'mysql' && (
            <>
              <p>
                <strong>MySQL:</strong> Enter your MySQL server connection details. The database must be accessible from
                this machine.
              </p>
              <p className="text-xs">Default port is 3306</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
