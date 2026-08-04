"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchData } from "@/lib/client/fetch-json";
import type { SessionUser } from "@/types";

export function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    try {
      await fetchData<{ signedOut: boolean }>("/api/auth/sign-out", {
        method: "POST",
      });
      router.refresh();
      router.push("/login");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="hidden size-9 place-items-center rounded-full bg-ink text-xs font-bold text-white sm:grid"
        title={user.email}
        aria-label={`Signed in as ${user.displayName}`}
      >
        {user.initials}
      </div>
      {user.isDemo ? null : (
        <button
          type="button"
          onClick={handleSignOut}
          disabled={pending}
          className="button-secondary min-h-9 px-3 py-1.5 text-xs"
        >
          {pending ? "Signing out…" : "Sign out"}
        </button>
      )}
    </div>
  );
}
