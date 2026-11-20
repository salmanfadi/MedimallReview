'use client';

import React from 'react';
import { Languages } from 'lucide-react';
import { Language } from '@/lib/types';
import { cn } from '@/lib/utils';

interface LanguageToggleProps {
  value: Language;
  onChange: (lang: Language) => void;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({
  value,
  onChange,
}) => {
  return (
    <div
      role="radiogroup"
      aria-label="Message language selection"
      className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200"
    >
      <div className="px-2 text-slate-400 hidden sm:flex items-center">
        <Languages className="w-4 h-4" />
      </div>

      <button
        type="button"
        role="radio"
        aria-checked={value === 'en'}
        onClick={() => onChange('en')}
        className={cn(
          'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 select-none min-h-[32px]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
          value === 'en'
            ? 'bg-white text-brand-800 shadow-sm border border-slate-200/60'
            : 'text-slate-600 hover:text-slate-900'
        )}
      >
        English
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={value === 'ml'}
        onClick={() => onChange('ml')}
        className={cn(
          'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 select-none min-h-[32px]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
          value === 'ml'
            ? 'bg-white text-brand-800 shadow-sm border border-slate-200/60'
            : 'text-slate-600 hover:text-slate-900'
        )}
      >
        മലയാളം
      </button>
    </div>
  );
};
