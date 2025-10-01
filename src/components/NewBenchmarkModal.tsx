import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { Modal } from './ui/Modal';
import { DatasetMetadata } from '../types';

interface NewBenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (metadata: DatasetMetadata) => void;
}

export const NewBenchmarkModal: React.FC<NewBenchmarkModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [creatorName, setCreatorName] = useState('');
  const [creatorEmail, setCreatorEmail] = useState('');
  const [errors, setErrors] = useState<{ name?: string }>({});

  const handleSubmit = () => {
    // Validate inputs
    const newErrors: { name?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Dataset name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Create dataset metadata
    const metadata: DatasetMetadata = {
      name: name.trim(),
      ...(description.trim() && { description: description.trim() }),
      ...(version.trim() && { version: version.trim() }),
      ...(creatorName.trim() && {
        creator: {
          '@type': 'Person',
          name: creatorName.trim(),
          ...(creatorEmail.trim() && { email: creatorEmail.trim() }),
        },
      }),
      dateCreated: new Date().toISOString(),
      dateModified: new Date().toISOString(),
    };

    // Call onCreate with the metadata
    onCreate(metadata);

    // Reset form
    handleReset();
  };

  const handleReset = () => {
    setName('');
    setDescription('');
    setVersion('1.0.0');
    setCreatorName('');
    setCreatorEmail('');
    setErrors({});
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Benchmark" size="lg">
      <div className="space-y-6">
        {/* Instructions */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-indigo-800 dark:text-indigo-300 font-medium mb-1">Start Fresh</p>
              <p className="text-sm text-indigo-700 dark:text-indigo-400">
                Create a new benchmark from scratch. This will clear all current data and initialize an empty workspace
                for you to build your benchmark suite.
              </p>
            </div>
          </div>
        </div>

        {/* Dataset Name Field */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Dataset Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors({ ...errors, name: undefined });
            }}
            placeholder="e.g., Science Questions Benchmark"
            className={`w-full px-4 py-3 border ${
              errors.name ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'
            } rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500`}
          />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
        </div>

        {/* Description Field */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe the purpose and scope of this benchmark..."
            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-y"
          />
        </div>

        {/* Optional Metadata */}
        <div className="border-t border-slate-200 dark:border-slate-600 pt-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Optional Information</h4>

          {/* Version Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Version</label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="e.g., 1.0.0"
              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          {/* Creator Name Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Creator Name</label>
            <input
              type="text"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              placeholder="Your name..."
              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          {/* Creator Email Field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Creator Email</label>
            <input
              type="email"
              value={creatorEmail}
              onChange={(e) => setCreatorEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-600 pt-4">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4 inline mr-2" />
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 dark:from-indigo-700 dark:to-purple-700 dark:hover:from-indigo-800 dark:hover:to-purple-800 text-white rounded-lg transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
          >
            <Sparkles className="w-4 h-4" />
            Create Benchmark
          </button>
        </div>
      </div>
    </Modal>
  );
};
