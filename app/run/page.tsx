"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getStoredEnabledSlugs } from "@/lib/topic-settings";

type ActiveRun = {
  id: string;
  wave: number;
  score: number;
  runMoney: number;
  livesRemaining: number;
  startedAt: string;
};

export default function RunPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [activeRun, setActiveRun] = useState<ActiveRun | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/run");
    }
  }, [status, router]);

  // Check for an active run as soon as the session is ready
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/run/active")
      .then((r) => r.json())
      .then((data) => setActiveRun(data.run ?? null))
      .catch(() => setActiveRun(null));
  }, [status]);

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

      {/* Active run banner */}
      {activeRun && (
        <div className="w-full max-w-md mb-6 rounded-xl border border-amber-500/40 bg-zinc-900/60 p-4">
          <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-2">
            Run in progress
          </p>
          <div className="flex gap-6 text-sm mb-3">
            <span><span className="text-red-400 font-bold">{activeRun.livesRemaining}</span> <span style={{ color: "var(--text-muted)" }}>lives</span></span>
            <span><span className="text-amber-400 font-bold">${activeRun.runMoney}</span> <span style={{ color: "var(--text-muted)" }}>run $</span></span>
            <span><span className="font-bold">{activeRun.score}</span> <span style={{ color: "var(--text-muted)" }}>score</span></span>
            {activeRun.wave > 1 && (
              <span><span className="text-blue-400 font-bold">Wave {activeRun.wave}</span></span>
            )}
          </div>
          <button
            onClick={() => router.push(`/run/${activeRun.id}`)}
            className="w-full px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 font-semibold text-sm transition"
          >
            Continue run →
          </button>
        </div>
      )}

      {error && <p className="text-red-400 mb-4">{error}</p>}

      <button
        onClick={startRun}
        disabled={starting}
        className="px-8 py-3 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 font-medium transition"
      >
        {starting ? "Starting..." : activeRun ? "Abandon & start new run" : "Start run"}
      </button>

      <Link href="/" className="mt-6 hover:underline" style={{ color: "var(--text-muted)" }}>Back to home</Link>
    </main>
  );
}
