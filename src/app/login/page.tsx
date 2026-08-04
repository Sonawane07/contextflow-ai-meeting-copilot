import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/app-shell";
import { LoginForm } from "@/features/auth/login-form";
import { safeRedirect } from "@/lib/auth/safe-redirect";
import { isDemoMode } from "@/lib/supabase/config";

// The demo-mode redirect is a runtime decision, so this page must not be
// prerendered against whatever mode happened to be set at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (isDemoMode()) {
    redirect("/dashboard");
  }

  const { next } = await searchParams;

  return (
    <main className="relative min-h-screen bg-paper text-ink">
      <div className="landing-grid pointer-events-none absolute inset-0 h-[560px]" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-16">
        <Link href="/" aria-label="ContextFlow home" className="mx-auto mb-8">
          <Brand />
        </Link>
        <LoginForm redirectTo={safeRedirect(next)} />
      </div>
    </main>
  );
}
