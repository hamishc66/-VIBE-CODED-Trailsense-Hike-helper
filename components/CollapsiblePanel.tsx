import React, { useState } from 'react';
import { IconChevronDown, IconChevronUp } from './Icons';

interface CollapsiblePanelProps {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

export const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({ 
  title, 
  children, 
  defaultExpanded = true,
  className = "",
  icon
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden ${className}`}>
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-900/30 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors"
      >
        <div className="flex items-center gap-2 font-bold text-stone-700 dark:text-stone-300">
          {icon}
          {title}
        </div>
        <div className="text-stone-400">
          {isExpanded ? <IconChevronUp className="w-5 h-5" /> : <IconChevronDown className="w-5 h-5" />}
        </div>
      </button>
      
      {isExpanded && (
        <div className="p-4 border-t border-stone-100 dark:border-stone-800 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
};