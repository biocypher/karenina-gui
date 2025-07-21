import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, FileText, Tag, User, Plus, Trash2 } from 'lucide-react';
import { CheckpointItem } from '../types';

interface MetadataEditorProps {
  isOpen: boolean;
  onClose: () => void;
  checkpointItem: CheckpointItem;
  questionId: string;
  onSave: (questionId: string, updatedItem: CheckpointItem) => void;
}

interface MetadataEditForm {
  finished: boolean;
  // Additional metadata fields that could be extended
  notes?: string;
  tags?: string[];
  customProperties?: { [key: string]: string };
}

export const MetadataEditor: React.FC<MetadataEditorProps> = ({
  isOpen,
  onClose,
  checkpointItem,
  questionId,
  onSave,
}) => {
  const [formData, setFormData] = useState<MetadataEditForm>({
    finished: checkpointItem.finished || false,
    notes: '',
    tags: [],
    customProperties: checkpointItem.custom_metadata || {},
  });

  const [isDirty, setIsDirty] = useState(false);

  // Reset form data when the checkpoint item changes (question switching)
  useEffect(() => {
    setFormData({
      finished: checkpointItem.finished || false,
      notes: '',
      tags: [],
      customProperties: checkpointItem.custom_metadata || {},
    });
    setIsDirty(false);
  }, [checkpointItem, questionId]);

  const handleInputChange = (
    field: keyof MetadataEditForm,
    value: string | boolean | string[] | { [key: string]: string }
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsDirty(true);
  };

  const handleCustomPropertyChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      customProperties: {
        ...prev.customProperties,
        [key]: value,
      },
    }));
    setIsDirty(true);
  };

  const addCustomProperty = () => {
    const key = prompt('Enter property name:');
    if (key && key.trim()) {
      handleCustomPropertyChange(key.trim(), '');
    }
  };

  const removeCustomProperty = (key: string) => {
    setFormData((prev) => {
      const newCustomProperties = { ...prev.customProperties };
      delete newCustomProperties[key];
      return {
        ...prev,
        customProperties: newCustomProperties,
      };
    });
    setIsDirty(true);
  };

  const handleSave = () => {
    const updatedItem: CheckpointItem = {
      ...checkpointItem,
      finished: formData.finished,
      last_modified: new Date().toISOString(),
      // Store custom properties in the checkpoint
      custom_metadata:
        formData.customProperties && Object.keys(formData.customProperties).length > 0
          ? formData.customProperties
          : undefined,
    };

    onSave(questionId, updatedItem);
    setIsDirty(false);
    onClose();
  };

  const handleCancel = () => {
    if (isDirty) {
      const confirmDiscard = window.confirm('You have unsaved changes. Are you sure you want to discard them?');
      if (!confirmDiscard) return;
    }

    // Reset form data to original values
    setFormData({
      finished: checkpointItem.finished || false,
      notes: '',
      tags: [],
      customProperties: checkpointItem.custom_metadata || {},
    });
    setIsDirty(false);
    onClose();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCancel} />

      {/* Modal */}
      <div className="relative bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 dark:border-slate-700/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Tag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Edit Metadata
          </h2>
          <button
            onClick={handleCancel}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Editable Metadata Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Editable Metadata
            </h3>

            {/* Status Toggle */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.finished}
                  onChange={(e) => handleInputChange('finished', e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 focus:ring-2 transition-colors"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Mark as finished</span>
              </label>
            </div>

            {/* Custom Properties */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Custom Properties
                </label>
                <button
                  onClick={addCustomProperty}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Property
                </button>
              </div>

              {Object.keys(formData.customProperties || {}).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(formData.customProperties || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={key}
                        readOnly
                        className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 font-mono"
                      />
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => handleCustomPropertyChange(key, e.target.value)}
                        className="flex-2 px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/90 dark:bg-slate-700/90 transition-colors"
                        placeholder="Value..."
                      />
                      <button
                        onClick={() => removeCustomProperty(key)}
                        className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400 italic text-center py-4 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-lg">
                  No custom properties defined. Click "Add Property" to add some.
                </div>
              )}
            </div>
          </div>

          {/* System Information Section (View-Only) */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              System Information (Read-Only)
            </h3>

            <div className="bg-slate-50/80 dark:bg-slate-700/80 backdrop-blur-sm rounded-xl p-4 border border-slate-100 dark:border-slate-600 shadow-inner">
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-slate-600 dark:text-slate-400">Question ID:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-mono text-xs">{questionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-600 dark:text-slate-400">Last Modified:</span>
                  <span className="text-slate-800 dark:text-slate-200">{formatDate(checkpointItem.last_modified)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-600 dark:text-slate-400">Question Length:</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {checkpointItem.question.length} characters
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-600 dark:text-slate-400">Answer Length:</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {checkpointItem.raw_answer.length} characters
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-600 dark:text-slate-400">Has Template:</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {checkpointItem.answer_template ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-600 dark:text-slate-400">Has Rubric:</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {checkpointItem.question_rubric ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-600 dark:text-slate-400">Custom Properties:</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {checkpointItem.custom_metadata && Object.keys(checkpointItem.custom_metadata).length > 0
                      ? `${Object.keys(checkpointItem.custom_metadata).length} properties`
                      : '❌ None'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Template Metadata (if available) */}
          {checkpointItem.answer_template && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Template Metadata (Read-Only)
              </h3>

              <div className="bg-slate-50/80 dark:bg-slate-700/80 backdrop-blur-sm rounded-xl p-4 border border-slate-100 dark:border-slate-600 shadow-inner">
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-600 dark:text-slate-400">Template Length:</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {checkpointItem.answer_template.length} characters
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-600 dark:text-slate-400">Original Template Length:</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {checkpointItem.original_answer_template.length} characters
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-600 dark:text-slate-400">Template Modified:</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {checkpointItem.answer_template !== checkpointItem.original_answer_template ? '✅ Yes' : '❌ No'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rubric Metadata (if available) */}
          {checkpointItem.question_rubric && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <User className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                Rubric Metadata (Read-Only)
              </h3>

              <div className="bg-slate-50/80 dark:bg-slate-700/80 backdrop-blur-sm rounded-xl p-4 border border-slate-100 dark:border-slate-600 shadow-inner">
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-600 dark:text-slate-400">Rubric Traits:</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {checkpointItem.question_rubric.traits.length} traits
                    </span>
                  </div>
                  <div className="col-span-1">
                    <span className="font-medium text-slate-600 dark:text-slate-400 block mb-2">Trait Names:</span>
                    <div className="flex flex-wrap gap-1">
                      {checkpointItem.question_rubric.traits.map((trait, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-md text-xs"
                        >
                          {trait.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200/50 dark:border-slate-700/50">
          <button
            onClick={handleCancel}
            className="px-5 py-2.5 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200 font-medium shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className="px-5 py-2.5 bg-indigo-600 dark:bg-indigo-700 text-white rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
