import React, { useState, useEffect } from 'react';
import { X, Save, Database, User, Building2, Plus, Trash2, Tag, FileText, Hash } from 'lucide-react';
import { DatasetMetadata, SchemaOrgPerson, SchemaOrgOrganization } from '../types';
import { useDatasetStore } from '../stores/useDatasetStore';

interface DatasetMetadataEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

interface DatasetEditForm {
  // Basic information
  name: string;
  description: string;
  version: string;
  license: string;
  keywords: string[];

  // Attribution
  creator?: SchemaOrgPerson | SchemaOrgOrganization;
  publisher?: SchemaOrgOrganization;
  creatorType: 'Person' | 'Organization';

  // Dates
  datePublished: string;

  // Custom properties
  customProperties: { [key: string]: string };
}

const commonLicenses = [
  'MIT',
  'Apache-2.0',
  'GPL-3.0',
  'BSD-3-Clause',
  'BSD-2-Clause',
  'ISC',
  'LGPL-2.1',
  'MPL-2.0',
  'CC-BY-4.0',
  'CC-BY-SA-4.0',
  'CC0-1.0',
  'Proprietary',
  'Other',
];

export const DatasetMetadataEditor: React.FC<DatasetMetadataEditorProps> = ({ isOpen, onClose, onSave }) => {
  const { metadata, setMetadata } = useDatasetStore();

  const [formData, setFormData] = useState<DatasetEditForm>({
    name: '',
    description: '',
    version: '1.0.0',
    license: '',
    keywords: [],
    creatorType: 'Person',
    datePublished: '',
    customProperties: {},
  });

  const [isDirty, setIsDirty] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');

  // Load metadata into form when component opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: metadata.name || '',
        description: metadata.description || '',
        version: metadata.version || '1.0.0',
        license: metadata.license || '',
        keywords: metadata.keywords || [],
        creator: metadata.creator,
        publisher: metadata.publisher,
        creatorType: metadata.creator?.['@type'] === 'Organization' ? 'Organization' : 'Person',
        datePublished: metadata.datePublished || '',
        customProperties: metadata.custom_properties || {},
      });
      setIsDirty(false);
    }
  }, [isOpen, metadata]);

  const handleInputChange = (
    field: keyof DatasetEditForm,
    value: string | string[] | SchemaOrgPerson | SchemaOrgOrganization | { [key: string]: string }
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsDirty(true);
  };

  const handleCreatorChange = (field: string, value: string) => {
    const creatorData =
      formData.creatorType === 'Person'
        ? {
            '@type': 'Person' as const,
            name: field === 'name' ? value : (formData.creator as SchemaOrgPerson)?.name || '',
            email: field === 'email' ? value : (formData.creator as SchemaOrgPerson)?.email || '',
            affiliation: field === 'affiliation' ? value : (formData.creator as SchemaOrgPerson)?.affiliation || '',
            url: field === 'url' ? value : (formData.creator as SchemaOrgPerson)?.url || '',
          }
        : {
            '@type': 'Organization' as const,
            name: field === 'name' ? value : (formData.creator as SchemaOrgOrganization)?.name || '',
            description:
              field === 'description' ? value : (formData.creator as SchemaOrgOrganization)?.description || '',
            email: field === 'email' ? value : (formData.creator as SchemaOrgOrganization)?.email || '',
            url: field === 'url' ? value : (formData.creator as SchemaOrgOrganization)?.url || '',
          };

    setFormData((prev) => ({
      ...prev,
      creator: creatorData,
    }));
    setIsDirty(true);
  };

  const handlePublisherChange = (field: string, value: string) => {
    const publisherData: SchemaOrgOrganization = {
      '@type': 'Organization',
      name: field === 'name' ? value : formData.publisher?.name || '',
      description: field === 'description' ? value : formData.publisher?.description || '',
      email: field === 'email' ? value : formData.publisher?.email || '',
      url: field === 'url' ? value : formData.publisher?.url || '',
    };

    setFormData((prev) => ({
      ...prev,
      publisher: publisherData,
    }));
    setIsDirty(true);
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !formData.keywords.includes(keywordInput.trim())) {
      handleInputChange('keywords', [...formData.keywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    handleInputChange(
      'keywords',
      formData.keywords.filter((k) => k !== keyword)
    );
  };

  const addCustomProperty = () => {
    const key = prompt('Enter property name:');
    if (key && key.trim()) {
      handleInputChange('customProperties', {
        ...formData.customProperties,
        [key.trim()]: '',
      });
    }
  };

  const updateCustomProperty = (key: string, value: string) => {
    handleInputChange('customProperties', {
      ...formData.customProperties,
      [key]: value,
    });
  };

  const removeCustomProperty = (key: string) => {
    const newProps = { ...formData.customProperties };
    delete newProps[key];
    handleInputChange('customProperties', newProps);
  };

  const handleSave = () => {
    const updatedMetadata: DatasetMetadata = {
      name: formData.name || undefined,
      description: formData.description || undefined,
      version: formData.version || undefined,
      license: formData.license || undefined,
      keywords: formData.keywords.length > 0 ? formData.keywords : undefined,
      creator: formData.creator && formData.creator.name ? formData.creator : undefined,
      publisher: formData.publisher && formData.publisher.name ? formData.publisher : undefined,
      datePublished: formData.datePublished || undefined,
      dateModified: new Date().toISOString(),
      custom_properties: Object.keys(formData.customProperties).length > 0 ? formData.customProperties : undefined,
    };

    // Keep existing dateCreated if it exists
    if (metadata.dateCreated) {
      updatedMetadata.dateCreated = metadata.dateCreated;
    } else if (!updatedMetadata.dateCreated) {
      updatedMetadata.dateCreated = new Date().toISOString();
    }

    setMetadata(updatedMetadata);
    setIsDirty(false);
    onSave?.();
    onClose();
  };

  const handleCancel = () => {
    if (isDirty) {
      const confirmDiscard = window.confirm('You have unsaved changes. Are you sure you want to discard them?');
      if (!confirmDiscard) return;
    }
    setIsDirty(false);
    onClose();
  };

  const handleKeywordKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCancel} />

      {/* Modal */}
      <div className="relative bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 dark:border-slate-700/30 w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Dataset Metadata
          </h2>
          <button
            onClick={handleCancel}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
              Basic Information
            </h3>

            <div className="bg-slate-50/50 dark:bg-slate-700/50 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">
                    Dataset Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white transition-colors"
                    placeholder="My Benchmark Dataset"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">Version</label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => handleInputChange('version', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white transition-colors"
                    placeholder="1.0.0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white transition-colors"
                  placeholder="Describe your dataset, its purpose, and contents..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">License</label>
                  <select
                    value={formData.license}
                    onChange={(e) => handleInputChange('license', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white transition-colors"
                  >
                    <option value="">Select a license...</option>
                    {commonLicenses.map((license) => (
                      <option key={license} value={license}>
                        {license}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">
                    Publication Date
                  </label>
                  <input
                    type="date"
                    value={formData.datePublished ? formData.datePublished.split('T')[0] : ''}
                    onChange={(e) =>
                      handleInputChange('datePublished', e.target.value ? new Date(e.target.value).toISOString() : '')
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Keywords */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Hash className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Keywords
            </h3>

            <div className="bg-slate-50/50 dark:bg-slate-700/50 rounded-lg p-4 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={handleKeywordKeyPress}
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white transition-colors"
                  placeholder="Add a keyword..."
                />
                <button
                  onClick={addKeyword}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>

              {formData.keywords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {formData.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-sm rounded-full"
                    >
                      {keyword}
                      <button
                        onClick={() => removeKeyword(keyword)}
                        className="p-0.5 hover:bg-purple-200 dark:hover:bg-purple-800/50 rounded-full transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                  No keywords added. Keywords help with discovery and categorization.
                </p>
              )}
            </div>
          </div>

          {/* Creator Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Creator
            </h3>

            <div className="bg-slate-50/50 dark:bg-slate-700/50 rounded-lg p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-white mb-2">Creator Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="creatorType"
                      value="Person"
                      checked={formData.creatorType === 'Person'}
                      onChange={(e) => handleInputChange('creatorType', e.target.value as 'Person' | 'Organization')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Person</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="creatorType"
                      value="Organization"
                      checked={formData.creatorType === 'Organization'}
                      onChange={(e) => handleInputChange('creatorType', e.target.value as 'Person' | 'Organization')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Organization</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.creator?.name || ''}
                    onChange={(e) => handleCreatorChange('name', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white transition-colors"
                    placeholder={formData.creatorType === 'Person' ? 'Creator name...' : 'Organization name...'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.creator?.email || ''}
                    onChange={(e) => handleCreatorChange('email', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white transition-colors"
                    placeholder="email@example.com"
                  />
                </div>
                {formData.creatorType === 'Person' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">Affiliation</label>
                    <input
                      type="text"
                      value={(formData.creator as SchemaOrgPerson)?.affiliation || ''}
                      onChange={(e) => handleCreatorChange('affiliation', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white transition-colors"
                      placeholder="University or organization..."
                    />
                  </div>
                )}
                {formData.creatorType === 'Organization' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">Description</label>
                    <input
                      type="text"
                      value={(formData.creator as SchemaOrgOrganization)?.description || ''}
                      onChange={(e) => handleCreatorChange('description', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white transition-colors"
                      placeholder="Organization description..."
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">URL</label>
                  <input
                    type="url"
                    value={formData.creator?.url || ''}
                    onChange={(e) => handleCreatorChange('url', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white transition-colors"
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Publisher Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              Publisher (Optional)
            </h3>

            <div className="bg-slate-50/50 dark:bg-slate-700/50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    value={formData.publisher?.name || ''}
                    onChange={(e) => handlePublisherChange('name', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white transition-colors"
                    placeholder="Publisher name..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.publisher?.email || ''}
                    onChange={(e) => handlePublisherChange('email', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white transition-colors"
                    placeholder="publisher@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">Description</label>
                  <input
                    type="text"
                    value={formData.publisher?.description || ''}
                    onChange={(e) => handlePublisherChange('description', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white transition-colors"
                    placeholder="Publisher description..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-white mb-1">URL</label>
                  <input
                    type="url"
                    value={formData.publisher?.url || ''}
                    onChange={(e) => handlePublisherChange('url', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white transition-colors"
                    placeholder="https://publisher.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Custom Properties */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Custom Properties
              </h3>
              <button
                onClick={addCustomProperty}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Property
              </button>
            </div>

            {Object.keys(formData.customProperties).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(formData.customProperties).map(([key, value]) => (
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
                          onChange={(e) => updateCustomProperty(key, e.target.value)}
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
            className="px-5 py-2.5 bg-blue-600 dark:bg-blue-700 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
