import type { ZodError, ZodIssue } from 'zod';

function describeIssue(issue: ZodIssue): string {
  switch (issue.code) {
    case 'too_small':
      if (issue.type === 'string') return `至少 ${issue.minimum} 个字符`;
      if (issue.type === 'number') return `不能小于 ${issue.minimum}`;
      if (issue.type === 'array') return `至少选择 ${issue.minimum} 项`;
      return issue.message;
    case 'too_big':
      if (issue.type === 'string') return `最多 ${issue.maximum} 个字符`;
      if (issue.type === 'number') return `不能大于 ${issue.maximum}`;
      if (issue.type === 'array') return `最多选择 ${issue.maximum} 项`;
      return issue.message;
    case 'invalid_type':
      return '请填写此项';
    case 'invalid_date':
      return '日期格式不正确';
    default:
      return issue.message;
  }
}

export function fieldErrors(error: ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : '_form';
    if (!result[key]) result[key] = describeIssue(issue);
  }
  return result;
}
