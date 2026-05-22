"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getStoredEnabledSlugs } from "@/lib/topic-settings";

export default function RunPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/run");
    }
  }, [status, router]);

  async function startRun() {
    setError("");
    setStarting(true);
    try {
      const catRes = await fetch("/api/categories");
      const raw = await catRes.json();
      const categories = Array.isArray(raw) ? raw : [];
      const slugs = categories.map((c: { slug: string }) => c.slug);
      const enabledSlugs = getStoredEnabledSlugs(slugs);

      const res = await fetch("/api/run/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabledSlugs }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to start run");
        return;
      }
      router.push(`/run/${data.run.id}`);
    } finally {
      setStarting(false);
    }
  }

  if (status === "loading" || status === "unauthenticated") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Loading...
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold mb-4">Start a run</h1>
      <p className="mb-6 text-center max-w-md" style={{ color: "var(--text-muted)" }}>
        You start with 3 lives and 0 run money. Answer correctly to earn money; wrong answers cost a life. Pay run money to skip a question or spend it in the shop between floors.
      </p>
      {error && <p className="text-red-400 mb-4">{error}</p>}
      <button
        onClick={startRun}
        disabled={starting}
        className="px-8 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 font-medium"
      >
        {starting ? "Starting..." : "Start run"}
      </button>
      <Link href="/" className="mt-6 hover:underline" style={{ color: "var(--text-muted)" }}>Back to home</Link>
    </main>
  );
}
