import type { SVGProps } from "react";

export type IconName =
  | "arrow"
  | "calendar"
  | "check"
  | "chevron"
  | "clock"
  | "document"
  | "home"
  | "inbox"
  | "list"
  | "mail"
  | "note"
  | "sparkles"
  | "task"
  | "users"
  | "x";

const paths: Record<IconName, React.ReactNode> = {
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  calendar: (
    <>
      <path d="M6 3v3m12-3v3M4 9h16" />
      <rect x="4" y="5" width="16" height="16" rx="2" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  document: (
    <>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v5h5M10 13h5m-5 4h5" />
    </>
  ),
  home: (
    <>
      <path d="m4 11 8-7 8 7" />
      <path d="M6 10v10h12V10" />
    </>
  ),
  inbox: (
    <>
      <path d="M5 5h14l2 11v3H3v-3z" />
      <path d="M3 16h5l1 2h6l1-2h5" />
    </>
  ),
  list: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r=".5" fill="currentColor" />
      <circle cx="4.5" cy="12" r=".5" fill="currentColor" />
      <circle cx="4.5" cy="18" r=".5" fill="currentColor" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  note: (
    <>
      <path d="M5 3h14v18H5z" />
      <path d="M9 8h6m-6 4h6m-6 4h4" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.4 3.6L17 8l-3.6 1.4L12 13l-1.4-3.6L7 8l3.6-1.4z" />
      <path d="m18 14 .8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z" />
      <path d="m5 13 .8 2.2L8 16l-2.2.8L5 19l-.8-2.2L2 16l2.2-.8z" />
    </>
  ),
  task: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="m8 9 1.5 1.5L12 8m2 2h3M8 16h9" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.8M17 15a5 5 0 0 1 3.5 5" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6 6 18" />,
};

export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
