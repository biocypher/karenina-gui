import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

// Import markdown files as raw strings
import kareninaFrameworkMd from '../../docs/karenina_framework.md?raw';
import generalConfigsMd from '../../docs/general_configs.md?raw';
import generationTabMd from '../../docs/generation_tab.md?raw';
import curationTabMd from '../../docs/curation_tab.md?raw';
import benchmarkingTabMd from '../../docs/benchmarking_tab.md?raw';

interface DocSection {
  id: string;
  title: string;
  content: string;
}

const docSections: DocSection[] = [
  {
    id: 'karenina-framework',
    title: 'The Karenina Framework',
    content: kareninaFrameworkMd,
  },
  {
    id: 'general-configs',
    title: 'General Configurations',
    content: generalConfigsMd,
  },
  {
    id: 'generation-tab',
    title: 'Template Generation',
    content: generationTabMd,
  },
  {
    id: 'curation-tab',
    title: 'Template Curation',
    content: curationTabMd,
  },
  {
    id: 'benchmarking-tab',
    title: 'Benchmarking',
    content: benchmarkingTabMd,
  },
];

export const DocsTab: React.FC = () => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['karenina-framework']));

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <BookOpen className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-800 via-blue-900 to-indigo-900 dark:from-slate-200 dark:via-blue-300 dark:to-indigo-300 bg-clip-text text-transparent">
            Documentation
          </h2>
        </div>
        <p className="text-slate-600 dark:text-slate-300 text-lg">
          Comprehensive guide to using the Karenina benchmarking system
        </p>
      </div>

      {/* Documentation Sections */}
      <div className="space-y-4">
        {docSections.map((section) => {
          const isExpanded = expandedSections.has(section.id);

          return (
            <div
              key={section.id}
              className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 overflow-hidden transition-all duration-200"
            >
              {/* Section Header - Clickable */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-indigo-600 dark:text-indigo-400 transition-transform" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-500 dark:text-slate-400 transition-transform" />
                  )}
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{section.title}</h3>
                </div>
              </button>

              {/* Section Content - Collapsible */}
              {isExpanded && (
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
                  <MarkdownRenderer content={section.content} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Note */}
      <div className="mt-8 p-4 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
        <p className="text-sm text-blue-800 dark:text-blue-300 text-center">
          💡 <strong>Tip:</strong> Click on any section header to expand or collapse its content. All documentation is
          embedded in the application for offline access.
        </p>
      </div>
    </div>
  );
};
