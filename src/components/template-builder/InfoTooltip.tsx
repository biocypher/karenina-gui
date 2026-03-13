import { useState, useRef, useEffect, useCallback } from 'react';

interface InfoTooltipProps {
  text: string;
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<'above' | 'below'>('above');
  const iconRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!iconRef.current) return;
    const rect = iconRef.current.getBoundingClientRect();
    // Show below if too close to top of viewport
    setPosition(rect.top < 80 ? 'below' : 'above');
  }, []);

  useEffect(() => {
    if (visible) updatePosition();
  }, [visible, updatePosition]);

  return (
    <span
      ref={iconRef}
      className="relative inline-flex items-center ml-1"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full
                   bg-blue-500/20 text-blue-400 text-[9px] font-bold cursor-help
                   hover:bg-blue-500/30 transition-colors"
        aria-label="Info"
      >
        i
      </span>
      {visible && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 w-64 px-3 py-2 text-xs text-gray-200 bg-gray-800
                      border border-gray-600 rounded-lg shadow-lg leading-relaxed
                      ${position === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'}
                      left-1/2 -translate-x-1/2`}
        >
          {text}
          <div
            className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800
                        border-gray-600 rotate-45
                        ${
                          position === 'above'
                            ? 'top-full -mt-1 border-r border-b'
                            : 'bottom-full -mb-1 border-l border-t'
                        }`}
          />
        </div>
      )}
    </span>
  );
}
