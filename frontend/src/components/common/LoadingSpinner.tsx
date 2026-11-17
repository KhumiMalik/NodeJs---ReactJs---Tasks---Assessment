import { cn } from '../../utils/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' };

export function LoadingSpinner({ size = 'md', label = 'Loading…', className }: LoadingSpinnerProps) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label || undefined}
      className={cn('inline-flex items-center', className)}
    >
      <svg
        className={cn('animate-spin text-indigo-600', sizes[size])}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    </span>
  );
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
