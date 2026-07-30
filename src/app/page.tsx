import Link from "next/link";
import { Brand } from "@/components/app-shell";
import { DemoBadge } from "@/components/demo-badge";
import { Icon } from "@/components/icons";

const features = [
  {
    icon: "document" as const,
    number: "01",
    title: "Context, distilled",
    description:
      "Bring the meeting’s synthetic emails, notes, and open items into one focused review.",
  },
  {
    icon: "sparkles" as const,
    number: "02",
    title: "Briefs with structure",
    description:
      "Generate an objective, key context, open questions, agenda, and proposed next steps.",
  },
  {
    icon: "check" as const,
    number: "03",
    title: "You stay in control",
    description:
      "Approve or reject every proposed action before it can move forward. Every decision is logged.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-paper text-ink">
      <div className="landing-grid pointer-events-none absolute inset-0 h-[760px]" />
      <nav className="relative z-10 mx-auto flex h-20 max-w-[1280px] items-center justify-between px-5 sm:px-8">
        <Brand />
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <DemoBadge />
          </div>
          <Link href="/dashboard" className="button-primary">
            Open demo
            <Icon name="arrow" className="size-4" />
          </Link>
        </div>
      </nav>

      <section className="relative z-10 mx-auto max-w-[1280px] px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:pb-28 lg:pt-32">
        <div className="mx-auto max-w-5xl text-center">
          <p className="eyebrow">Meeting intelligence, with boundaries</p>
          <h1 className="mt-5 font-display text-[clamp(3.4rem,8vw,7.5rem)] font-semibold leading-[0.86] tracking-[-0.075em]">
            Walk in aligned.
            <span className="block text-coral">Walk out in control.</span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-base leading-7 text-ink/60 sm:text-lg">
            ContextFlow turns focused meeting context into a clear brief and
            reviewable follow-up actions—without pretending to run your digital
            life.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-ink px-6 text-sm font-bold text-white shadow-[0_16px_36px_rgba(23,34,29,0.18)] transition-transform hover:-translate-y-0.5"
            >
              Explore the working demo
              <Icon name="arrow" className="size-4" />
            </Link>
            <span className="px-4 text-xs font-semibold text-ink/40">
              No account or API key required
            </span>
          </div>
        </div>

        <div className="relative mx-auto mt-20 max-w-5xl">
          <div className="absolute -left-12 -top-12 size-36 rounded-full bg-mint/65 blur-2xl" />
          <div className="absolute -bottom-12 -right-10 size-40 rounded-full bg-coral/20 blur-3xl" />
          <div className="relative overflow-hidden rounded-[26px] border border-ink/10 bg-ink p-3 shadow-[0_40px_100px_rgba(23,34,29,0.22)]">
            <div className="flex items-center gap-1.5 px-2 py-1.5">
              <span className="size-2.5 rounded-full bg-coral" />
              <span className="size-2.5 rounded-full bg-amber-300" />
              <span className="size-2.5 rounded-full bg-mint" />
            </div>
            <div className="grid gap-3 rounded-[18px] bg-[#f8f8f3] p-4 sm:p-6 md:grid-cols-[1.2fr_.8fr]">
              <div className="rounded-2xl border border-ink/8 bg-white p-5 sm:p-7">
                <div className="flex items-center justify-between">
                  <span className="eyebrow">Tuesday · 10:00 AM</span>
                  <span className="rounded-full bg-mint/35 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                    Ready
                  </span>
                </div>
                <h2 className="mt-5 font-display text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
                  Product weekly: activation
                </h2>
                <p className="mt-2 text-sm text-ink/50">
                  3 attendees · 3 context signals · 2 open items
                </p>
                <div className="mt-8 rounded-2xl bg-paper p-5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-ink/45">
                    <Icon name="sparkles" className="size-4 text-coral" />
                    Meeting objective
                  </div>
                  <p className="mt-3 text-sm leading-6 text-ink/75">
                    Choose the next activation experiment and leave with a clear
                    owner, success signal, and delivery window.
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl bg-coral p-5 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
                    Your queue
                  </p>
                  <p className="mt-3 font-display text-4xl font-semibold tracking-[-0.05em]">
                    03
                  </p>
                  <p className="mt-1 text-sm text-white/75">
                    actions need a decision
                  </p>
                </div>
                <div className="rounded-2xl border border-ink/8 bg-white p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-ink text-white">
                      <Icon name="mail" className="size-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold">Draft decision recap</p>
                      <p className="mt-1 text-[11px] text-ink/40">
                        Waiting for approval
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <span className="rounded-lg border border-ink/10 px-3 py-2 text-center text-[11px] font-bold">
                      Reject
                    </span>
                    <span className="rounded-lg bg-ink px-3 py-2 text-center text-[11px] font-bold text-white">
                      Approve
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-ink/8 bg-white/45">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[.65fr_1.35fr]">
            <div>
              <p className="eyebrow">A deliberately focused flow</p>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
                Less automation theater. More useful preparation.
              </h2>
            </div>
            <div className="grid gap-px overflow-hidden rounded-2xl border border-ink/8 bg-ink/8 md:grid-cols-3">
              {features.map((feature) => (
                <article key={feature.title} className="bg-paper p-6 sm:p-7">
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-white text-coral shadow-sm">
                      <Icon name={feature.icon} className="size-5" />
                    </span>
                    <span className="font-mono text-xs text-ink/30">
                      {feature.number}
                    </span>
                  </div>
                  <h3 className="mt-8 font-display text-xl font-semibold tracking-[-0.03em]">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-ink/55">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
