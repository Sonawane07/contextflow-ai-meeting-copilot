export function DemoBadge({ demoMode }: { demoMode: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-ink/12 bg-white/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-ink/70 shadow-sm">
      <span
        className={`size-1.5 rounded-full ${
          demoMode ? "bg-mint ring-4 ring-mint/20" : "bg-coral ring-4 ring-coral/20"
        }`}
      />
      {demoMode ? "Demo mode" : "Live workspace"}
    </span>
  );
}
