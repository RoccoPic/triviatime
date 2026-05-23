"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function GameOverPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const runId = params.runId as string;
  const [run, setRun] = useState<{ score: number; currentFloor: number; runMoney: number } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    if (runId && status === "authenticated") {
      fetch(`/api/run/${runId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.run) setRun(d.run);
          else setRun({ score: 0, currentFloor: 0, runMoney: 0 });
        })
        .catch(() => setRun({ score: 0, currentFloor: 0, runMoney: 0 }));
    }
  }, [runId, status, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-2">Game Over</h1>
      <p className="mb-8" style={{ color: "var(--text-muted)" }}>Run ended. Half your run money was added to your collection.</p>
      {run && (
        <div className="flex gap-6 mb-8 text-center">
          <div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Score</p>
            <p className="text-xl font-bold">{run.score}</p>
          </div>
          <div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Floors reached</p>
            <p className="text-xl font-bold">{run.currentFloor}</p>
          </div>
          <div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Run money (50% → collection)</p>
            <p className="text-xl font-bold text-amber-400">{Math.floor(run.runMoney * 0.5)}</p>
          </div>
        </div>
      )}
      <div className="flex gap-4">
        <Link href="/run" className="px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 font-medium">
          Start new run
        </Link>
        <Link href="/progress" className="px-6 py-3 rounded-lg border border-zinc-600 hover:border-zinc-500 font-medium">
          My progress
        </Link>
        <Link href="/" className="px-6 py-3 hover:underline" style={{ color: "var(--text-muted)" }}>Home</Link>
      </div>
    </main>
  );
}
