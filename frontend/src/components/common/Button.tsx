import type { ComponentProps } from 'react';
import { cn } from '../../utils/cn';
import { LoadingSpinner } from './LoadingSpinner';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

const variantClasses: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline-indigo-600 shadow-sm',
  secondary:
    'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:outline-indigo-600 shadow-sm',
  danger: 'bg-red-600 text-white hover:bg-red-500 focus-visible:outline-red-600 shadow-sm',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-indigo-600',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-2.5 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
};

interface ButtonProps extends ComponentProps<'button'> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-semibold transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {isLoading && <LoadingSpinner size="sm" className="text-current" label="" />}
      {children}
    </button>
  );
}
