import { useLayoutEffect, useRef, useState } from 'react';
import { FieldError, Input, Label, TextField } from '@heroui/react';
import { Icon } from './Icon';

interface PasswordInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  isInvalid?: boolean;
  isDisabled?: boolean;
  error?: string;
  isRequired?: boolean;
  className?: string;
  name?: string;
  autoFocus?: boolean;
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
  isRequired,
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
          <Icon name={visible ? 'eyeOff' : 'eye'} className="size-4" />
        </button>
      </div>
      {hasError ? <FieldError>{error}</FieldError> : null}
    </TextField>
  );
}
