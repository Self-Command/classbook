export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export const pageClass =
  'mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6 sm:py-12';

export const inputClass =
  'w-full rounded-xl border border-ink/15 bg-white/80 px-3.5 py-2.5 text-sm text-ink shadow-sm transition placeholder:text-ink-faint/70 focus:border-ink/40 focus:outline-none focus:ring-2 focus:ring-ink/10 disabled:cursor-not-allowed disabled:opacity-60';

export const textareaClass = `${inputClass} min-h-[120px] resize-y leading-relaxed`;

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper shadow-sm transition hover:bg-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:cursor-not-allowed disabled:opacity-50';

export const btnCoral =
  'inline-flex items-center justify-center gap-2 rounded-full bg-coral px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-coral/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:cursor-not-allowed disabled:opacity-50';

export const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-full border border-ink/15 bg-white/70 px-4 py-2.5 text-sm font-medium text-ink transition hover:border-ink/30 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:cursor-not-allowed disabled:opacity-50';

export const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 disabled:cursor-not-allowed disabled:opacity-50';

export const btnDanger =
  'inline-flex items-center justify-center gap-2 rounded-full bg-coral px-4 py-2.5 text-sm font-medium text-white transition hover:bg-coral/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40 disabled:cursor-not-allowed disabled:opacity-50';

export const cardClass =
  'rounded-[18px] border border-ink/10 bg-white/80 shadow-card';

export const sectionTitleClass = 'font-display text-2xl text-ink sm:text-3xl';

export const alertErrorClass =
  'rounded-xl border border-coral/30 bg-coral/10 px-3.5 py-2.5 text-sm leading-6 text-coral';

export const linkClass =
  'font-medium text-coral underline-offset-4 transition hover:underline';
