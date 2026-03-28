// src/components/template-builder/DynamicGroundTruth.tsx
import { useState, type KeyboardEvent } from 'react';

interface DynamicGroundTruthProps {
  fieldType: string;
  value: unknown;
  onChange: (value: unknown) => void;
  literalValues?: string[] | null;
}

const INPUT_CLASS =
  'w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-base text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none';

export function DynamicGroundTruth({ fieldType, value, onChange, literalValues }: DynamicGroundTruthProps) {
  const [tagInput, setTagInput] = useState('');

  switch (fieldType) {
    case 'bool':
      return (
        <div className="flex gap-0 w-fit rounded-lg overflow-hidden border border-gray-700">
          <button
            type="button"
            onClick={() => onChange(true)}
            className={`px-5 py-2 text-sm font-semibold transition-colors ${
              value === true ? 'bg-green-800 text-green-300' : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onChange(false)}
            className={`px-5 py-2 text-sm font-semibold transition-colors ${
              value === false ? 'bg-red-900 text-red-300' : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
            }`}
          >
            No
          </button>
        </div>
      );

    case 'int':
      return (
        <input
          type="number"
          step={1}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
          className={INPUT_CLASS}
          placeholder="Enter a whole number..."
        />
      );

    case 'float':
      return (
        <input
          type="number"
          step="any"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
          className={INPUT_CLASS}
          placeholder="Enter a decimal number..."
        />
      );

    case 'list_str': {
      const items: string[] = Array.isArray(value) ? value : [];

      const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim()) {
          e.preventDefault();
          onChange([...items, tagInput.trim()]);
          setTagInput('');
        }
      };

      const removeItem = (index: number) => {
        onChange(items.filter((_, i) => i !== index));
      };

      return (
        <div>
          {items.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-2">
              {items.map((item, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 bg-blue-900/30 border border-blue-700 rounded-full px-3 py-1 text-sm text-blue-300"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="text-blue-400 hover:text-blue-200 text-xs"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className={INPUT_CLASS}
            placeholder="Type an item and press Enter to add..."
          />
        </div>
      );
    }

    case 'literal': {
      const options = literalValues ?? [];
      if (options.length === 0) {
        return <p className="text-sm text-gray-500 italic">Define allowed values above first.</p>;
      }
      return (
        <div className="flex gap-2 flex-wrap">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                value === opt
                  ? 'bg-blue-700 border-blue-500 text-white'
                  : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      );
    }

    case 'date':
      return (
        <input type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={INPUT_CLASS} />
      );

    default:
      return (
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={INPUT_CLASS}
          placeholder="Enter the expected answer..."
        />
      );
  }
}
