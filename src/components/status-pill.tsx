import type { ActionStatus } from "@/types";

export function StatusPill({ status }: { status: ActionStatus }) {
  const styles = {
    pending: "border-amber-200 bg-amber-50 text-amber-800",
    approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
    rejected: "border-rose-200 bg-rose-50 text-rose-800",
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize ${styles}`}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}
