import React, { useState } from 'react';
import { Sparkles, X, Loader } from 'lucide-react';
import { csrf } from '../../utils/csrf';
import { API_ENDPOINTS } from '../../constants/api';

interface CreateBenchmarkFormProps {
  storageUrl: string;
  onSuccess: (benchmarkName: string) => void;
  onCancel: () => void;
}

export const CreateBenchmarkForm: React.FC<CreateBenchmarkFormProps> = ({ storageUrl, onSuccess, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [creator, setCreator] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Benchmark name is required');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await csrf.fetchWithCsrf(API_ENDPOINTS.DATABASE_CREATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storage_url: storageUrl,
          name: name.trim(),
          description: description.trim() || undefined,
          version: version.trim() || undefined,
          creator: creator.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create benchmark');
      }

      const data = await response.json();
      onSuccess(data.benchmark_name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create benchmark');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Create New Benchmark</h4>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={isCreating}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Benchmark Name */}
        <div>
          <label htmlFor="benchmark-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Benchmark Name <span className="text-red-500">*</span>
          </label>
          <input
            id="benchmark-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Science Questions Benchmark"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            disabled={isCreating}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="benchmark-description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Description
          </label>
          <textarea
            id="benchmark-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Brief description of this benchmark..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white resize-y"
            disabled={isCreating}
          />
        </div>

        {/* Version and Creator in a row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="benchmark-version"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Version
            </label>
            <input
              id="benchmark-version"
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0.0"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              disabled={isCreating}
            />
          </div>
          <div>
            <label
              htmlFor="benchmark-creator"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Creator
            </label>
            <input
              id="benchmark-creator"
              type="text"
              value={creator}
              onChange={(e) => setCreator(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              disabled={isCreating}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700
                     rounded-md transition-colors"
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isCreating || !name.trim()}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700
                     text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Create Benchmark
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
