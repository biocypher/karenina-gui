import { useEffect } from 'react';
import { useCurationStore } from '../../stores/useCurationStore';
import { buildCurationExport } from '../../utils/curation';
import { downloadJSON } from '../../utils/fileDownload';

interface CurationExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CurationExportDialog({ open, onClose }: CurationExportDialogProps) {
  const store = useCurationStore();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleExport = () => {
    const exportData = buildCurationExport({
      curators: store.curators,
      templateJudgments: store.templateJudgments,
      rubricJudgments: store.rubricJudgments,
      curatedFlags: store.curatedFlags,
      scenarioTemplateJudgments: store.scenarioTemplateJudgments,
      scenarioRubricJudgments: store.scenarioRubricJudgments,
      scenarioCuratedFlags: store.scenarioCuratedFlags,
      sourceMetadata: store.sourceMetadata,
    });

    // downloadJSON appends ".json" automatically, so pass the base name only
    const date = new Date().toISOString().split('T')[0];
    const filename = `curation_${date}`;
    downloadJSON(exportData, filename);
    store.markExported();
    onClose();
  };

  const totalJudgments =
    Object.values(store.templateJudgments).reduce(
      (sum, curator) => sum + Object.values(curator).reduce((s, r) => s + Object.keys(r).length, 0),
      0
    ) +
    Object.values(store.rubricJudgments).reduce(
      (sum, curator) => sum + Object.values(curator).reduce((s, r) => s + Object.keys(r).length, 0),
      0
    );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full border border-slate-300 dark:border-gray-600"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-medium text-slate-800 dark:text-gray-200 mb-3">Export Curation</h3>
        <div className="text-xs text-slate-500 dark:text-gray-400 space-y-1 mb-4">
          <p>
            Curators: <span className="text-slate-800 dark:text-gray-200">{store.curators.length}</span>
          </p>
          <p>
            Total judgments: <span className="text-slate-800 dark:text-gray-200">{totalJudgments}</span>
          </p>
          <p>
            Format: <span className="text-slate-800 dark:text-gray-200">Standalone Curation JSON v1.0</span>
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-xs bg-teal-700 text-white rounded hover:bg-teal-600"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
