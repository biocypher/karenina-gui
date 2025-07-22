import React, { useState, useEffect } from 'react';
import { X, Save, Tag, User, Plus, Trash2, BookOpen, Link } from 'lucide-react';
import { CheckpointItem, SchemaOrgPerson, SchemaOrgCreativeWork } from '../types';

interface MetadataEditorProps {
  isOpen: boolean;
  onClose: () => void;
  checkpointItem: CheckpointItem;
  questionId: string;
  onSave: (questionId: string, updatedItem: CheckpointItem) => void;
}

interface MetadataEditForm {
  finished: boolean;
  customProperties?: { [key: string]: string };
  author?: Partial<SchemaOrgPerson>;
  sources?: SchemaOrgCreativeWork[];
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
    customProperties: checkpointItem.custom_metadata || {},
    author: checkpointItem.author,
    sources: checkpointItem.sources || [],
  });

  const [isDirty, setIsDirty] = useState(false);

  // Reset form data when the checkpoint item changes (question switching)
  useEffect(() => {
    setFormData({
      finished: checkpointItem.finished || false,
      customProperties: checkpointItem.custom_metadata || {},
      author: checkpointItem.author,
      sources: checkpointItem.sources || [],
    });
    setIsDirty(false);
  }, [checkpointItem, questionId]);

  const handleInputChange = (
    field: keyof MetadataEditForm,
    value: string | boolean | { [key: string]: string } | SchemaOrgPerson | SchemaOrgCreativeWork[]
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

  const handleAuthorChange = (field: keyof SchemaOrgPerson, value: string) => {
    setFormData((prev) => ({
      ...prev,
      author: {
        '@type': 'Person',
        ...prev.author,
        [field]: value,
      },
    }));
    setIsDirty(true);
  };

  const addSource = (type: 'ScholarlyArticle' | 'WebPage') => {
    const newSource: SchemaOrgCreativeWork = {
      '@type': type,
      name: '',
    };
    setFormData((prev) => ({
      ...prev,
      sources: [...(prev.sources || []), newSource],
    }));
    setIsDirty(true);
  };

  const updateSource = (index: number, field: keyof SchemaOrgCreativeWork, value: string) => {
    setFormData((prev) => {
      const newSources = [...(prev.sources || [])];
      newSources[index] = {
        ...newSources[index],
        [field]: value,
      };
      return {
        ...prev,
        sources: newSources,
      };
    });
    setIsDirty(true);
  };

  const removeSource = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      sources: prev.sources?.filter((_, i) => i !== index) || [],
    }));
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
      // Store schema.org enhanced metadata
      author: formData.author && formData.author.name ? (formData.author as SchemaOrgPerson) : undefined,
      sources: formData.sources && formData.sources.length > 0 ? formData.sources : undefined,
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
      customProperties: checkpointItem.custom_metadata || {},
      author: checkpointItem.author,
      sources: checkpointItem.sources || [],
    });
    setIsDirty(false);
    onClose();
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
          <div className="space-y-6">
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

            {/* Author Field */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Question Author
              </h4>
              <div className="bg-slate-50/50 dark:bg-slate-700/50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">Name *</label>
                    <input
                      type="text"
                      value={formData.author?.name || ''}
                      onChange={(e) => handleAuthorChange('name', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white transition-colors"
                      placeholder="Author name..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.author?.email || ''}
                      onChange={(e) => handleAuthorChange('email', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white transition-colors"
                      placeholder="author@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">Affiliation</label>
                    <input
                      type="text"
                      value={formData.author?.affiliation || ''}
                      onChange={(e) => handleAuthorChange('affiliation', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white transition-colors"
                      placeholder="University or organization..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">URL</label>
                    <input
                      type="url"
                      value={formData.author?.url || ''}
                      onChange={(e) => handleAuthorChange('url', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white transition-colors"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sources Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-green-600 dark:text-green-400" />
                  Sources
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => addSource('ScholarlyArticle')}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Academic
                  </button>
                  <button
                    onClick={() => addSource('WebPage')}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Web
                  </button>
                </div>
              </div>

              {formData.sources && formData.sources.length > 0 ? (
                <div className="space-y-3">
                  {formData.sources.map((source, index) => (
                    <div key={index} className="bg-slate-50/50 dark:bg-slate-700/50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {source['@type'] === 'ScholarlyArticle' ? (
                            <BookOpen className="w-4 h-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <Link className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          )}
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                            {source['@type'] === 'ScholarlyArticle' ? 'Academic Source' : 'Web Source'}
                          </span>
                        </div>
                        <button
                          onClick={() => removeSource(index)}
                          className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">Title</label>
                          <input
                            type="text"
                            value={source.name}
                            onChange={(e) => updateSource(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white transition-colors"
                            placeholder="Source title..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">
                            {source['@type'] === 'WebPage' ? 'URL *' : 'URL'}
                          </label>
                          <input
                            type="url"
                            value={source.url || ''}
                            onChange={(e) => updateSource(index, 'url', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white transition-colors"
                            placeholder="https://..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">
                            {source['@type'] === 'ScholarlyArticle' ? 'DOI/Identifier *' : 'Publisher'}
                          </label>
                          <input
                            type="text"
                            value={
                              source['@type'] === 'ScholarlyArticle' ? source.identifier || '' : source.publisher || ''
                            }
                            onChange={(e) =>
                              updateSource(
                                index,
                                source['@type'] === 'ScholarlyArticle' ? 'identifier' : 'publisher',
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white transition-colors"
                            placeholder={
                              source['@type'] === 'ScholarlyArticle' ? 'DOI or identifier...' : 'Publisher name...'
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400 italic text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-lg">
                  No sources added. Click "Academic" or "Web" to add sources.
                </div>
              )}
            </div>

            {/* Custom Properties - Enhanced with more space */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-medium text-slate-700 dark:text-slate-300">Custom Properties</h4>
                <button
                  onClick={addCustomProperty}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Property
                </button>
              </div>

              {Object.keys(formData.customProperties || {}).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(formData.customProperties || {}).map(([key, value]) => (
                    <div key={key} className="bg-slate-50/50 dark:bg-slate-700/50 rounded-lg p-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 dark:text-white mb-1">
                            Property Name
                          </label>
                          <input
                            type="text"
                            value={key}
                            readOnly
                            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-600/50 text-slate-600 dark:text-slate-400 font-mono"
                          />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-xs font-medium text-slate-500 dark:text-white mb-1">Value</label>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => handleCustomPropertyChange(key, e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white transition-colors"
                            placeholder="Property value..."
                          />
                        </div>
                        <div className="flex justify-center">
                          <button
                            onClick={() => removeCustomProperty(key)}
                            className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400 italic text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-lg">
                  No custom properties defined. Click "Add Property" to add some.
                </div>
              )}
            </div>
          </div>
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
