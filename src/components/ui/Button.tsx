import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'whatsapp' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 ease-in-out ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
      'disabled:cursor-not-allowed select-none active:scale-[0.98]';

    const variants = {
      primary:
        'bg-primary hover:bg-brand-600 active:bg-brand-700 text-white shadow-subtle ' +
        'focus-visible:ring-brand-500 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none',
      secondary:
        'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 ' +
        'focus-visible:ring-slate-400 disabled:bg-slate-100 disabled:text-slate-400',
      outline:
        'border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 ' +
        'focus-visible:ring-brand-500 disabled:border-slate-200 disabled:text-slate-300',
      ghost:
        'bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-700 ' +
        'focus-visible:ring-slate-400 disabled:text-slate-300',
      danger:
        'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-subtle ' +
        'focus-visible:ring-red-500 disabled:bg-red-200',
      whatsapp:
        'bg-[#25D366] hover:bg-[#1ebe5d] active:bg-[#128C7E] text-white font-semibold shadow-subtle ' +
        'focus-visible:ring-[#25D366] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none',
    };

    // Strict WCAG 2.2 touch target standard (min 44x44px for primary interactive elements)
    const sizes = {
      sm: 'text-xs h-9 min-h-[36px] px-3 gap-1.5',
      md: 'text-sm h-11 min-h-[44px] px-4 gap-2',
      lg: 'text-base h-12 min-h-[48px] px-6 gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
            <span>Loading...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
