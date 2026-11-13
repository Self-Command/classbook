import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </IconBase>
  );
}

export function IconClose(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </IconBase>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </IconBase>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c.6-3.1 2.8-5 5.5-5s4.9 1.9 5.5 5" />
      <path d="M15.5 5.4a3 3 0 0 1 0 5.2M17.5 14.4c1.7.6 2.8 2.2 3.2 4.6" />
    </IconBase>
  );
}

export function IconMessage(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20.5 11.5a8 8 0 0 1-8.2 8 9.4 9.4 0 0 1-2.7-.4L4.5 21l1.3-4.3a7.7 7.7 0 0 1-1.3-4.3 8 8 0 0 1 8-8 8 8 0 0 1 8 7.1Z" />
      <path d="M8.5 11.5h7M8.5 8.5h4.5" />
    </IconBase>
  );
}

export function IconAlbum(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <circle cx="9" cy="10" r="1.4" />
      <path d="m5.5 17 4.4-4.2a2 2 0 0 1 2.7 0l1.2 1.1 1.8-1.7a2 2 0 0 1 2.7 0l1.2 1.1" />
    </IconBase>
  );
}

export function IconClock(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </IconBase>
  );
}

export function IconUser(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.8 20c.8-3.6 3.5-5.8 7.2-5.8s6.4 2.2 7.2 5.8" />
    </IconBase>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M14 4.5H7.5A2.5 2.5 0 0 0 5 7v10a2.5 2.5 0 0 0 2.5 2.5H14" />
      <path d="M17 8.5 20.5 12 17 15.5M10 12h10" />
    </IconBase>
  );
}

export function IconCamera(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.5 8.5h2.4l1.4-2h7.4l1.4 2h2.4A1.5 1.5 0 0 1 21 10v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18v-8a1.5 1.5 0 0 1 1.5-1.5Z" />
      <circle cx="12" cy="14" r="3.4" />
    </IconBase>
  );
}

export function IconLock(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2" />
    </IconBase>
  );
}

export function IconSparkle(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.5c.6 3.9 2.1 5.4 6 6-3.9.6-5.4 2.1-6 6-.6-3.9-2.1-5.4-6-6 3.9-.6 5.4-2.1 6-6Z" />
      <path d="M18.5 15.5c.3 1.7 1 2.4 2.7 2.7-1.7.3-2.4 1-2.7 2.7-.3-1.7-1-2.4-2.7-2.7 1.7-.3 2.4-1 2.7-2.7Z" />
    </IconBase>
  );
}

export function IconShield(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.5 19 6v5.5c0 4-2.8 7.2-7 9-4.2-1.8-7-5-7-9V6l7-2.5Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </IconBase>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
      <path d="M8 3.5v4M16 3.5v4M3.5 10h17" />
    </IconBase>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.8 21 20H3l9-16.2Z" />
      <path d="M12 9.5v4.3M12 17h.01" />
    </IconBase>
  );
}

export function IconLeaf(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20 4.5c-8.5-1-14 2.7-14 8.2 0 2 .8 3.6 2 4.7 1.2 1.2 2.8 1.8 4.7 1.8 5.5 0 8.3-5.7 7.3-14.7Z" />
      <path d="M4 20c2.2-4.4 5.2-7.4 9.5-9.4" />
    </IconBase>
  );
}
