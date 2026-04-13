import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCurationStore } from '../../stores/useCurationStore';

export function CuratorManager() {
  const { curators, activeCuratorId, addCurator, removeCurator, setActiveCurator } = useCurationStore(
    useShallow((s) => ({
      curators: s.curators,
      activeCuratorId: s.activeCuratorId,
      addCurator: s.addCurator,
      removeCurator: s.removeCurator,
      setActiveCurator: s.setActiveCurator,
    }))
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMetaKey, setNewMetaKey] = useState('');
  const [newMetaValue, setNewMetaValue] = useState('');
  const [metadataPairs, setMetadataPairs] = useState<[string, string][]>([]);

  const handleAdd = () => {
    if (!newName.trim()) return;
    const metadata: Record<string, string> = {};
    for (const [k, v] of metadataPairs) {
      if (k.trim()) metadata[k.trim()] = v;
    }
    addCurator(newName.trim(), metadata);
    setNewName('');
    setMetadataPairs([]);
    setShowAddForm(false);
  };

  const handleAddMetaPair = () => {
    if (!newMetaKey.trim()) return;
    setMetadataPairs([...metadataPairs, [newMetaKey.trim(), newMetaValue]]);
    setNewMetaKey('');
    setNewMetaValue('');
  };

  return (
    <div className="relative flex items-center gap-2">
      <span className="text-xs text-gray-500">Curator:</span>
      {curators.length > 0 ? (
        <select
          value={activeCuratorId ?? ''}
          onChange={(e) => setActiveCurator(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-teal-400"
          title="Each curator's judgments are independent. You cannot see other curators' assessments to avoid anchoring bias."
        >
          {curators.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      ) : (
        <span className="text-xs text-gray-600 italic">No curators</span>
      )}

      <button
        onClick={() => setShowAddForm(!showAddForm)}
        className="bg-gray-700 text-gray-300 px-2 py-1 text-xs rounded hover:bg-gray-600"
      >
        + Add
      </button>

      {activeCuratorId && (
        <button
          onClick={() => {
            if (
              window.confirm(
                `Remove curator "${curators.find((c) => c.id === activeCuratorId)?.name}"? Their judgments will be deleted.`
              )
            ) {
              removeCurator(activeCuratorId);
            }
          }}
          className="text-gray-500 hover:text-red-400 text-xs px-1"
          title="Remove current curator"
        >
          Remove
        </button>
      )}

      {showAddForm && (
        <div className="absolute top-full right-0 mt-1 bg-gray-800 border border-gray-600 rounded p-3 shadow-lg z-10 min-w-64">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Curator name (required)"
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 mb-2"
            autoFocus
          />
          {metadataPairs.map(([k, v], i) => (
            <div key={i} className="text-xs text-gray-400 mb-1">
              {k}: {v}
            </div>
          ))}
          <div className="flex gap-1 mb-2">
            <input
              value={newMetaKey}
              onChange={(e) => setNewMetaKey(e.target.value)}
              placeholder="Key"
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-xs text-gray-200"
            />
            <input
              value={newMetaValue}
              onChange={(e) => setNewMetaValue(e.target.value)}
              placeholder="Value"
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-xs text-gray-200"
            />
            <button onClick={handleAddMetaPair} className="text-xs text-gray-400 hover:text-gray-200 px-1">
              +
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="bg-teal-700 text-white px-3 py-1 text-xs rounded hover:bg-teal-600">
              Add
            </button>
            <button onClick={() => setShowAddForm(false)} className="text-gray-400 text-xs hover:text-gray-200">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
