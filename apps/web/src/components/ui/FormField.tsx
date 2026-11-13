import type { InputHTMLAttributes, ReactNode } from 'react';
import { Description, FieldError, Input, Label, TextArea, TextField } from '@heroui/react';

interface BaseFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: ReactNode;
  error?: string;
  placeholder?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  maxLength?: number;
  autoComplete?: string;
  className?: string;
}

interface SingleLineFieldProps extends BaseFieldProps {
  multiline?: false;
  type?: InputHTMLAttributes<HTMLInputElement>['type'];
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
  rows?: never;
}

interface MultiLineFieldProps extends BaseFieldProps {
  multiline: true;
  rows?: number;
  type?: never;
  inputMode?: never;
}

export type FormFieldProps = SingleLineFieldProps | MultiLineFieldProps;

export function FormField(props: FormFieldProps) {
  const hasError = Boolean(props.error);

  return (
    <TextField
      className={props.className}
      fullWidth
      isRequired={props.isRequired}
      isDisabled={props.isDisabled}
      isInvalid={hasError}
      value={props.value}
      onChange={props.onChange}
    >
      <Label>{props.label}</Label>
      {props.multiline ? (
        <TextArea
          placeholder={props.placeholder}
          maxLength={props.maxLength}
          rows={props.rows ?? 4}
          autoComplete={props.autoComplete}
        />
      ) : (
        <Input
          type={props.type ?? 'text'}
          inputMode={props.inputMode}
          placeholder={props.placeholder}
          maxLength={props.maxLength}
          autoComplete={props.autoComplete}
        />
      )}
      {props.description ? <Description>{props.description}</Description> : null}
      {hasError ? <FieldError>{props.error}</FieldError> : null}
    </TextField>
  );
}
