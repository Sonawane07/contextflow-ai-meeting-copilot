"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DemoBadge } from "@/components/demo-badge";
import { Icon, type IconName } from "@/components/icons";
import { UserMenu } from "@/features/auth/user-menu";
import type { SessionUser } from "@/types";

const navigation: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home" },
  { href: "/actions", label: "Action center", icon: "task" },
  { href: "/audit-log", label: "Audit log", icon: "list" },
];

export function Brand() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-[10px] bg-ink text-paper shadow-sm">
        <Icon name="sparkles" className="size-[18px]" />
      </span>
      <span className="font-display text-lg font-semibold tracking-[-0.035em]">
        ContextFlow
      </span>
    </span>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-30 border-b border-ink/8 bg-paper/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[74px] max-w-[1480px] items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="ContextFlow home">
            <Brand />
          </Link>
          <div className="flex items-center gap-3">
            <DemoBadge demoMode={user.isDemo} />
            <UserMenu user={user} />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1480px] lg:grid-cols-[228px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100vh-74px)] border-r border-ink/8 px-5 py-8 lg:block">
          <nav aria-label="Primary navigation" className="space-y-1.5">
            {navigation.map((item) => {
              const active =
                pathname === item.href ||
                (item.href === "/dashboard" &&
                  pathname.startsWith("/meetings/"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-ink text-white"
                      : "text-ink/55 hover:bg-white hover:text-ink"
                  }`}
                >
                  <Icon name={item.icon} className="size-[18px]" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-10 rounded-2xl border border-ink/8 bg-white/65 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/40">
              Safe by design
            </p>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              Suggested actions stay paused until you approve or reject them.
            </p>
          </div>
        </aside>

        <main className="min-w-0 px-5 py-7 sm:px-8 sm:py-10 lg:px-10 xl:px-14">
          {children}
        </main>
      </div>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-around rounded-2xl border border-white/20 bg-ink px-2 py-2 text-white shadow-2xl lg:hidden"
      >
        {navigation.map((item) => {
          const active =
            pathname === item.href ||
            (item.href === "/dashboard" && pathname.startsWith("/meetings/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-20 flex-col items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-semibold ${
                active ? "bg-white/12 text-mint" : "text-white/60"
              }`}
            >
              <Icon name={item.icon} className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
