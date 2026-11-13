import type { ZodType } from 'zod';

export type FieldErrors = Record<string, string>;

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: FieldErrors };

export function validateForm<T>(schema: ZodType<T>, input: unknown): ValidationResult<T> {
  const parsed = schema.safeParse(input);
  if (parsed.success) {
    return { success: true, data: parsed.data };
  }

  const errors: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path.length > 0 ? String(issue.path[0]) : '_form';
    if (!errors[field]) {
      errors[field] = issue.message;
    }
  }

  if (Object.keys(errors).length === 0) {
    errors._form = parsed.error.issues[0]?.message ?? '请检查填写内容';
  }

  return { success: false, errors };
}
