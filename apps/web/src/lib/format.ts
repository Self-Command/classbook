const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const shortDateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'long',
  day: 'numeric',
});

function parseDate(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(iso: string): string {
  const date = parseDate(iso);
  return date ? dateFormatter.format(date) : '日期未知';
}

export function formatDateTime(iso: string): string {
  const date = parseDate(iso);
  return date ? dateTimeFormatter.format(date) : '日期未知';
}

export function formatShortDate(iso: string): string {
  const date = parseDate(iso);
  return date ? shortDateFormatter.format(date) : '日期未知';
}

export function formatBirthday(value: string | null): string | null {
  if (!value) return null;
  const [month, day] = value.split('-');
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  if (!Number.isInteger(monthNumber) || !Number.isInteger(dayNumber)) return value;
  return `${monthNumber} 月 ${dayNumber} 日`;
}

export function timelineYear(iso: string): number | null {
  const date = parseDate(iso);
  return date ? date.getFullYear() : null;
}
