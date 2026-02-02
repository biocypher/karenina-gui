import React, { useState, useEffect } from 'react';
import { Database, Loader, CheckCircle, AlertCircle, Folder, Plus, Unplug, Trash2 } from 'lucide-react';
import { DeleteDatabaseModal } from './DeleteDatabaseModal';
import { API_ENDPOINTS } from '../../constants/api';

interface CurrentConnection {
  storageUrl: string;
  benchmarkName?: string | null;
}

interface DatabaseConnectTabProps {
  onConnect: (storageUrl: string) => void;
  onDisconnect?: () => void;
  currentConnection?: CurrentConnection | null;
}

type DatabaseType = 'sqlite' | 'postgresql' | 'mysql';

interface DatabaseInfo {
  name: string;
  path: string;
  size: number | null;
}

interface ListDatabasesResponse {
  success: boolean;
  databases: DatabaseInfo[];
  db_directory: string;
  is_default_directory: boolean;
  error?: string;
}

export const DatabaseConnectTab: React.FC<DatabaseConnectTabProps> = ({
  onConnect,
  onDisconnect,
  currentConnection,
}) => {
  // Available databases
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [dbDirectory, setDbDirectory] = useState('');
  const [isDefaultDirectory, setIsDefaultDirectory] = useState(true);
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(true);
  const [selectedDatabase, setSelectedDatabase] = useState<DatabaseInfo | null>(null);

  // Create new database form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [dbType, setDbType] = useState<DatabaseType>('sqlite');
  const [newDbName, setNewDbName] = useState('');

  // PostgreSQL/MySQL fields for new database
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('5432');
  const [database, setDatabase] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'error'>('idle');
  const [benchmarkCount, setBenchmarkCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  // Delete database modal state
  const [databaseToDelete, setDatabaseToDelete] = useState<DatabaseInfo | null>(null);

  // Load available databases on mount
  useEffect(() => {
    loadDatabases();
  }, []);

  // Reset port when database type changes
  useEffect(() => {
    setPort(dbType === 'postgresql' ? '5432' : '3306');
  }, [dbType]);

  const loadDatabases = async () => {
    setIsLoadingDatabases(true);
    try {
      const response = await fetch(API_ENDPOINTS.DATABASE_LIST);
      if (!response.ok) {
        throw new Error('Failed to load databases');
      }
      const data: ListDatabasesResponse = await response.json();
      setDatabases(data.databases);
      setDbDirectory(data.db_directory);
      setIsDefaultDirectory(data.is_default_directory);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load databases');
    } finally {
      setIsLoadingDatabases(false);
    }
  };

  const handleSelectDatabase = (db: DatabaseInfo) => {
    setSelectedDatabase(db);
    setConnectionStatus('idle');
    setErrorMessage('');
  };

  const handleConnect = async () => {
    if (!selectedDatabase) {
      setErrorMessage('Please select a database');
      return;
    }

    setIsConnecting(true);
    setErrorMessage('');
    setConnectionStatus('idle');

    try {
      const storageUrl = `sqlite:///${selectedDatabase.path}`;
      const response = await fetch(API_ENDPOINTS.DATABASE_CONNECT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_url: storageUrl,
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
      onConnect(storageUrl);
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to connect to database');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCreateNew = async () => {
    let storageUrl = '';

    // Validate based on database type
    if (dbType === 'sqlite') {
      if (!newDbName.trim()) {
        setErrorMessage('Please enter a database name');
        return;
      }
      const dbFileName = newDbName.endsWith('.db') ? newDbName : `${newDbName}.db`;
      storageUrl = `sqlite:///${dbDirectory}/${dbFileName}`;
    } else {
      // PostgreSQL/MySQL
      if (!host || !database) {
        setErrorMessage('Please enter host and database name');
        return;
      }
      const auth = username ? `${username}${password ? `:${password}` : ''}@` : '';
      storageUrl =
        dbType === 'postgresql'
          ? `postgresql://${auth}${host}:${port}/${database}`
          : `mysql://${auth}${host}:${port}/${database}`;
    }

    setIsConnecting(true);
    setErrorMessage('');
    setConnectionStatus('idle');

    try {
      const response = await fetch(API_ENDPOINTS.DATABASE_CONNECT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_url: storageUrl,
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
      onConnect(storageUrl);

      // Reload databases list if it was SQLite
      if (dbType === 'sqlite') {
        await loadDatabases();
      }

      // Hide the form
      setShowCreateForm(false);
      setNewDbName('');
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create database');
    } finally {
      setIsConnecting(false);
    }
  };

  // Extract database name from storage URL for display
  const getDbNameFromUrl = (url: string): string => {
    if (url.startsWith('sqlite:///')) {
      const path = url.replace('sqlite:///', '');
      return path.split('/').pop() || url;
    }
    return url;
  };

  // Handle delete button click
  const handleDeleteClick = (db: DatabaseInfo, e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger selection

    // Check if this is the connected database
    const dbStorageUrl = `sqlite:///${db.path}`;
    if (currentConnection?.storageUrl === dbStorageUrl) {
      // Disconnect first
      if (onDisconnect) {
        onDisconnect();
      }
    }

    setDatabaseToDelete(db);
  };

  // Handle successful deletion
  const handleDeleteSuccess = () => {
    setDatabaseToDelete(null);
    // Refresh the database list
    loadDatabases();
    // Clear selection if we deleted the selected database
    if (selectedDatabase?.path === databaseToDelete?.path) {
      setSelectedDatabase(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Currently Connected Banner */}
      {currentConnection && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                  Connected to: {getDbNameFromUrl(currentConnection.storageUrl)}
                </p>
                {currentConnection.benchmarkName && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    Benchmark: {currentConnection.benchmarkName}
                  </p>
                )}
              </div>
            </div>
            {onDisconnect && (
              <button
                onClick={onDisconnect}
                className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30
                         hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md transition-colors
                         flex items-center gap-2 border border-red-200 dark:border-red-700"
              >
                <Unplug className="h-4 w-4" />
                Disconnect
              </button>
            )}
          </div>
        </div>
      )}

      {/* Directory Information */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <Folder className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Database Directory</p>
        </div>
        <code className="text-sm text-blue-700 dark:text-blue-300 break-all">{dbDirectory}</code>
        {isDefaultDirectory && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            (Using current working directory - set DB_PATH environment variable to change)
          </p>
        )}
      </div>

      {/* Available Databases List */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Available Databases</h3>

        {isLoadingDatabases ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : !databases || databases.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <Database className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No databases found</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Create a new database to get started</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
            {databases.map((db) => {
              const isConnectedDb = currentConnection?.storageUrl === `sqlite:///${db.path}`;
              return (
                <div
                  key={db.path}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-md transition-colors
                    ${
                      selectedDatabase?.path === db.path
                        ? 'bg-blue-100 dark:bg-blue-900/40 border-2 border-blue-500 dark:border-blue-400'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                    }
                  `}
                >
                  <button
                    onClick={() => handleSelectDatabase(db)}
                    disabled={isConnecting || connectionStatus === 'connected'}
                    className="flex-1 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{db.name}</span>
                        {isConnectedDb && (
                          <span className="px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 rounded">
                            Connected
                          </span>
                        )}
                      </div>
                      {db.size !== null && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {(db.size / 1024).toFixed(1)} KB
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={(e) => handleDeleteClick(db, e)}
                    disabled={isConnecting}
                    className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete database"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Connect Button */}
      {!showCreateForm && connectionStatus !== 'connected' && (
        <button
          onClick={handleConnect}
          disabled={isConnecting || !selectedDatabase}
          className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700
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
              Connect
            </>
          )}
        </button>
      )}

      {/* Create New Database Section */}
      {!showCreateForm && connectionStatus !== 'connected' ? (
        <button
          onClick={() => setShowCreateForm(true)}
          disabled={isConnecting}
          className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700
                   text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                   disabled:transform-none"
        >
          <Plus className="h-5 w-5" />
          Create New Database
        </button>
      ) : (
        showCreateForm &&
        connectionStatus !== 'connected' && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Create New Database</h4>

            {/* Database Type Selector */}
            <div className="mb-4">
              <label
                htmlFor="db-type-select"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Database Type
              </label>
              <select
                id="db-type-select"
                value={dbType}
                onChange={(e) => setDbType(e.target.value as DatabaseType)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                disabled={isConnecting}
              >
                <option value="sqlite">SQLite</option>
                <option value="postgresql">PostgreSQL</option>
                <option value="mysql">MySQL</option>
              </select>
            </div>

            {/* SQLite Fields */}
            {dbType === 'sqlite' && (
              <div className="mb-4">
                <label
                  htmlFor="sqlite-db-name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Database Name
                </label>
                <input
                  id="sqlite-db-name"
                  type="text"
                  value={newDbName}
                  onChange={(e) => setNewDbName(e.target.value)}
                  placeholder="my_database.db"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  disabled={isConnecting}
                />
              </div>
            )}

            {/* PostgreSQL/MySQL Fields */}
            {(dbType === 'postgresql' || dbType === 'mysql') && (
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="pg-host"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Host
                    </label>
                    <input
                      id="pg-host"
                      type="text"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      placeholder="localhost"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
                               focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      disabled={isConnecting}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="pg-port"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Port
                    </label>
                    <input
                      id="pg-port"
                      type="text"
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
                               focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      disabled={isConnecting}
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="pg-database"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Database Name
                  </label>
                  <input
                    id="pg-database"
                    type="text"
                    value={database}
                    onChange={(e) => setDatabase(e.target.value)}
                    placeholder="mydatabase"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    disabled={isConnecting}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="pg-username"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Username
                    </label>
                    <input
                      id="pg-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="user"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
                               focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      disabled={isConnecting}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="pg-password"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Password
                    </label>
                    <input
                      id="pg-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
                               focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      disabled={isConnecting}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewDbName('');
                  setErrorMessage('');
                }}
                disabled={isConnecting}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700
                         rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNew}
                disabled={isConnecting}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700
                         text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center gap-2"
              >
                {isConnecting ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    Create & Connect
                  </>
                )}
              </button>
            </div>
          </div>
        )
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
          <p>
            <strong>Database Directory:</strong> Set the{' '}
            <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">DB_PATH</code> environment variable to specify
            where databases are stored. If not set, the current working directory is used.
          </p>
          <p>
            <strong>SQLite:</strong> Select an existing database from the list above, or create a new one by clicking
            "Create New Database".
          </p>
          {(dbType === 'postgresql' || dbType === 'mysql') && (
            <p>
              <strong>{dbType === 'postgresql' ? 'PostgreSQL' : 'MySQL'}:</strong> Enter server connection details when
              creating a new database connection. The database must be accessible from this machine.
            </p>
          )}
        </div>
      </div>

      {/* Delete Database Modal */}
      {databaseToDelete && (
        <DeleteDatabaseModal
          database={databaseToDelete}
          isOpen={true}
          onClose={() => setDatabaseToDelete(null)}
          onDeleted={handleDeleteSuccess}
        />
      )}
    </div>
  );
};
