"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { fetchData } from "@/lib/client/fetch-json";
import type { SessionUser } from "@/types";

type Mode = "sign-in" | "sign-up";

interface AuthResult {
  user: SessionUser | null;
  confirmationRequired?: boolean;
}

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isSignUp = mode === "sign-up";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);

    try {
      const endpoint = isSignUp ? "/api/auth/sign-up" : "/api/auth/sign-in";
      const payload = isSignUp
        ? { email, password, displayName: displayName || undefined }
        : { email, password };

      const result = await fetchData<AuthResult>(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (result.data.confirmationRequired) {
        setNotice(
          "Check your inbox for a confirmation link, then sign in to continue.",
        );
        setMode("sign-in");
        return;
      }

      // refresh() re-runs the server components so the shell picks up the
      // new session before the navigation completes.
      router.refresh();
      router.push(redirectTo);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "The request failed.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
      <h1 className="font-display text-2xl font-semibold tracking-[-0.03em]">
        {isSignUp ? "Create your workspace" : "Sign in to ContextFlow"}
      </h1>
      <p className="mt-2 text-sm leading-6 text-ink/55">
        {isSignUp
          ? "New accounts start with the same synthetic meetings the demo uses, owned by you."
          : "Your meetings, briefs, and decisions stay scoped to your account."}
      </p>

      <div className="mt-6 space-y-4">
        {isSignUp ? (
          <div>
            <label
              htmlFor="displayName"
              className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-ink/45"
            >
              Display name
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              autoComplete="name"
              className="field"
              value={displayName}
              maxLength={80}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </div>
        ) : null}

        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-ink/45"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="field"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-ink/45"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            className="field"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {isSignUp ? (
            <p className="mt-1.5 text-xs text-ink/45">
              At least 8 characters.
            </p>
          ) : null}
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {error}
        </p>
      ) : null}

      {notice ? (
        <p
          role="status"
          className="mt-5 rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink/70"
        >
          {notice}
        </p>
      ) : null}

      <button type="submit" className="button-primary mt-6 w-full" disabled={pending}>
        {pending
          ? "Working…"
          : isSignUp
            ? "Create account"
            : "Sign in"}
        {pending ? null : <Icon name="arrow" className="size-4" />}
      </button>

      <p className="mt-5 text-center text-sm text-ink/55">
        {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
        <button
          type="button"
          className="font-semibold text-ink underline underline-offset-4"
          onClick={() => {
            setMode(isSignUp ? "sign-in" : "sign-up");
            setError(null);
            setNotice(null);
          }}
        >
          {isSignUp ? "Sign in" : "Create one"}
        </button>
      </p>
    </form>
  );
}
