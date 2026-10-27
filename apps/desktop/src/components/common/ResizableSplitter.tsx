import React, { useState, useEffect, useCallback } from 'react';

interface ResizableSplitterProps {
  direction?: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
  onReset?: () => void;
  className?: string;
}

export const ResizableSplitter: React.FC<ResizableSplitterProps> = ({
  direction = 'horizontal',
  onResize,
  onReset,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDoubleClick = () => {
    if (onReset) onReset();
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      if (direction === 'horizontal') {
        onResize(e.movementX);
      } else {
        onResize(e.movementY);
      }
    },
    [isDragging, direction, onResize]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp, direction]);

  return (
    <div
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      className={`group relative flex items-center justify-center transition-colors z-20 ${
        direction === 'horizontal'
          ? 'w-1.5 cursor-col-resize hover:bg-indigo-500/30'
          : 'h-1.5 cursor-row-resize hover:bg-indigo-500/30'
      } ${isDragging ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-transparent'} ${className}`}
      title="Drag to resize panel (Double-click to reset)"
    >
      <div
        className={`transition-all rounded-full ${
          direction === 'horizontal'
            ? 'w-0.5 h-6 group-hover:h-12 bg-white/20 group-hover:bg-indigo-400'
            : 'h-0.5 w-6 group-hover:w-12 bg-white/20 group-hover:bg-indigo-400'
        } ${isDragging ? 'bg-indigo-300 scale-125' : ''}`}
      />
    </div>
  );
};
