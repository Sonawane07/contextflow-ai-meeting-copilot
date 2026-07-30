import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: {
    default: "ContextFlow — AI Meeting Copilot",
    template: "%s · ContextFlow",
  },
  description:
    "Turn focused meeting context into reviewable briefs and human-approved follow-up actions.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
