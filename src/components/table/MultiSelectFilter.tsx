import React, { useState, useEffect, useRef } from 'react';

interface MultiSelectFilterProps {
  options: string[];
  selectedValues: Set<string>;
  onChange: (values: Set<string>) => void;
  placeholder: string;
}

export const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  options,
  selectedValues,
  onChange,
  placeholder,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-left truncate"
      >
        {selectedValues.size === 0 ? placeholder : `${selectedValues.size} selected`}
      </button>
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded shadow-lg max-h-32 overflow-y-auto">
          {options.map((option) => (
            <label
              key={option}
              className="flex items-center px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedValues.has(option)}
                onChange={(e) => {
                  const newValues = new Set(selectedValues);
                  if (e.target.checked) {
                    newValues.add(option);
                  } else {
                    newValues.delete(option);
                  }
                  onChange(newValues);
                }}
                className="mr-2"
              />
              <span className="text-xs text-slate-900 dark:text-slate-100 truncate">{option}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};
