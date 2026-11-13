import { useLayoutEffect, useRef, useState } from 'react';
import { Description, FieldError, Input, Label, TextField } from '@heroui/react';

interface PasswordInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  isInvalid?: boolean;
  isDisabled?: boolean;
  error?: string;
  description?: string;
  isRequired?: boolean;
  maxLength?: number;
  className?: string;
  name?: string;
  autoFocus?: boolean;
}

function EyeIcon({ off = false }: { off?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4"
    >
      {off ? (
        <>
          <path d="m3 3 18 18" />
          <path d="M10.6 5.2A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2" />
          <path d="M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 7 10 7a11 11 0 0 0 5.4-1.5" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </>
      ) : (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

export function PasswordInput({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  isInvalid,
  isDisabled,
  error,
  description,
  isRequired,
  maxLength,
  className,
  name,
  autoFocus,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<{ start: number | null; end: number | null }>({
    start: null,
    end: null,
  });
  const hasError = Boolean(error);

  const rememberSelection = () => {
    const input = inputRef.current;
    selectionRef.current = {
      start: input?.selectionStart ?? null,
      end: input?.selectionEnd ?? null,
    };
  };

  useLayoutEffect(() => {
    const input = inputRef.current;
    const { start, end } = selectionRef.current;
    if (!input || start === null || end === null) return;
    if (document.activeElement !== input) return;
    input.setSelectionRange(start, end);
  }, [visible]);

  return (
    <TextField
      className={className}
      fullWidth
      name={name}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isInvalid={Boolean(isInvalid) || hasError}
      value={value}
      onChange={onChange}
    >
      <Label>{label}</Label>
      <div className="relative">
        <Input
          ref={inputRef}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          autoFocus={autoFocus}
          className="pr-11"
        />
        <button
          type="button"
          aria-label={visible ? '隐藏密码' : '显示密码'}
          aria-pressed={visible}
          disabled={isDisabled}
          onMouseDown={(event) => {
            event.preventDefault();
            rememberSelection();
          }}
          onClick={() => {
            rememberSelection();
            setVisible((current) => !current);
          }}
          className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-default hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50"
        >
          <EyeIcon off={visible} />
        </button>
      </div>
      {description ? <Description>{description}</Description> : null}
      {hasError ? <FieldError>{error}</FieldError> : null}
    </TextField>
  );
}
