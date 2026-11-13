import type { ReactNode } from 'react';
import { cx } from '@/lib/styles';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required = false,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <label htmlFor={htmlFor} className="text-sm font-medium text-ink-soft">
          {label}
          {required && <span className="ml-0.5 text-coral">*</span>}
        </label>
        {hint && <span className="text-[11px] text-ink-faint">{hint}</span>}
      </div>
      {children}
      {error && (
        <p className="mt-1.5 text-xs leading-5 text-coral" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function FieldStatus({
  tone,
  children,
}: {
  tone: 'pending' | 'success' | 'error';
  children: ReactNode;
}) {
  return (
    <p
      className={cx(
        'mt-1.5 text-xs leading-5',
        tone === 'pending' && 'text-ink-faint',
        tone === 'success' && 'text-sage',
        tone === 'error' && 'text-coral',
      )}
    >
      {children}
    </p>
  );
}
