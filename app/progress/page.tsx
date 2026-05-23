"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Progress = {
  collectionMoney: number;
  byCategory: Record<string, { correct: number; total: number }>;
  runs: Array<{ id: string; score: number; floor: number; startedAt: string; endedAt: string | null }>;
};

export default function ProgressPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/progress");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/progress")
        .then((r) => r.json())
        .then(setProgress)
        .catch(() => setProgress({ collectionMoney: 0, byCategory: {}, runs: [] }));
    }
  }, [status, router]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Loading...
      </main>
    );
  }

  const categories = progress?.byCategory ?? {};
  const runs = progress?.runs ?? [];

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">My progress</h1>

        <section className="mb-8 p-4 rounded-lg bg-zinc-900 border border-zinc-700">
          <h2 className="text-lg font-semibold mb-2">Collection</h2>
          <p className="text-amber-400 font-bold text-xl">{progress?.collectionMoney ?? 0} collected</p>
          <p className="text-zinc-300 text-sm mt-1">50% of run money is added here when a run ends.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">By category</h2>
          <div className="space-y-3">
            {Object.entries(categories).map(([slug, { correct, total }]) => (
              <div
                key={slug}
                className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-700"
              >
                <span className="capitalize font-medium">{slug}</span>
                <span className="text-zinc-200">
                  {correct} / {total}
                  {total > 0 ? ` (${Math.round((correct / total) * 100)}%)` : ""}
                </span>
              </div>
            ))}
            {Object.keys(categories).length === 0 && (
              <p style={{ color: "var(--text-muted)" }}>Play some runs to see category stats.</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">Recent runs</h2>
          <div className="space-y-2">
            {runs.slice(0, 10).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-700"
              >
                <div>
                  <span className="font-medium">Score {r.score}</span>
                  <span className="text-zinc-300 text-sm ml-2">Floor {r.floor}</span>
                </div>
                <span className="text-zinc-300 text-sm">
                  {r.endedAt ? "Ended" : "In progress"}
                </span>
              </div>
            ))}
            {runs.length === 0 && (
              <p style={{ color: "var(--text-muted)" }}>No runs yet.</p>
            )}
          </div>
        </section>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/run" className="px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 font-medium">
            Start run
          </Link>
          <Link href="/settings" className="px-6 py-3 rounded-lg border border-zinc-600 hover:border-zinc-500 font-medium">
            Settings
          </Link>
          <Link href="/" className="px-6 py-3 hover:underline" style={{ color: "var(--text-muted)" }}>Home</Link>
        </div>
      </div>
    </main>
  );
}
