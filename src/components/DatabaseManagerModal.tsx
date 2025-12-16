import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { UnifiedCheckpoint } from '../types';
import { DatabaseConnectTab } from './database/DatabaseConnectTab';
import { DatabaseManageTab } from './database/DatabaseManageTab';
import { useDatasetStore } from '../stores/useDatasetStore';

interface DatabaseManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadCheckpoint: (checkpoint: UnifiedCheckpoint, storageUrl?: string) => void;
}

type TabType = 'connect' | 'manage';

export const DatabaseManagerModal: React.FC<DatabaseManagerModalProps> = ({ isOpen, onClose, onLoadCheckpoint }) => {
  const {
    isConnectedToDatabase,
    storageUrl,
    currentBenchmarkName,
    connectDatabase,
    disconnectDatabase,
    setCurrentBenchmarkName,
  } = useDatasetStore();

  // Initialize state from store - preserve connection across modal open/close
  const [activeTab, setActiveTab] = useState<TabType>(isConnectedToDatabase ? 'manage' : 'connect');
  const [connectedStorageUrl, setConnectedStorageUrl] = useState<string | null>(storageUrl);

  // Sync state when modal opens - restore connection state from store
  useEffect(() => {
    if (isOpen) {
      if (isConnectedToDatabase && storageUrl) {
        setConnectedStorageUrl(storageUrl);
        setActiveTab('manage');
      }
    }
  }, [isOpen, isConnectedToDatabase, storageUrl]);

  const handleConnect = (storageUrl: string) => {
    setConnectedStorageUrl(storageUrl);
    // Update global database connection state (but without benchmark name yet)
    connectDatabase(storageUrl, null);
    // Switch to manage tab
    setActiveTab('manage');
  };

  const handleDisconnect = () => {
    // Clear global connection state
    disconnectDatabase();
    // Clear local state
    setConnectedStorageUrl(null);
    // Switch to connect tab
    setActiveTab('connect');
  };

  const handleLoadBenchmark = (checkpoint: UnifiedCheckpoint, benchmarkName: string) => {
    // Update global state with benchmark name
    setCurrentBenchmarkName(benchmarkName);

    // Pass checkpoint and storage URL to parent
    onLoadCheckpoint(checkpoint, connectedStorageUrl || undefined);

    // Close modal
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Database Manager" size="xl">
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('connect')}
            className={`
              px-6 py-3 font-medium transition-colors relative
              ${
                activeTab === 'connect'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }
            `}
          >
            Connect to Database
          </button>
          <button
            onClick={() => connectedStorageUrl && setActiveTab('manage')}
            disabled={!connectedStorageUrl}
            className={`
              px-6 py-3 font-medium transition-colors relative
              ${
                activeTab === 'manage'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : connectedStorageUrl
                    ? 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              }
            `}
          >
            Manage Benchmarks
            {!connectedStorageUrl && <span className="ml-2 text-xs">(Connect first)</span>}
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'connect' && (
            <DatabaseConnectTab
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              currentConnection={
                connectedStorageUrl ? { storageUrl: connectedStorageUrl, benchmarkName: currentBenchmarkName } : null
              }
            />
          )}

          {activeTab === 'manage' && connectedStorageUrl && (
            <DatabaseManageTab storageUrl={connectedStorageUrl} onLoadBenchmark={handleLoadBenchmark} />
          )}
        </div>
      </div>
    </Modal>
  );
};
