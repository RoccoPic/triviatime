"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getStoredEnabledSlugs } from "@/lib/topic-settings";
import { CLASSES, CLASS_COLORS } from "@/lib/class-defs";
import type { ClassDef } from "@/lib/class-defs";

type ActiveRun = {
  id: string;
  wave: number;
  score: number;
  runMoney: number;
  livesRemaining: number;
  startedAt: string;
};

type ClassWithStatus = ClassDef & { unlocked: boolean };

export default function RunPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [activeRun, setActiveRun] = useState<ActiveRun | null | undefined>(undefined);

  // Class selector state
  const [classes, setClasses] = useState<ClassWithStatus[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("regular");
  const [savingClass, setSavingClass] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/run");
    }
  }, [status, router]);

  // Fetch active run + available classes in parallel
  useEffect(() => {
    if (status !== "authenticated") return;

    fetch("/api/run/active")
      .then((r) => r.json())
      .then((data) => setActiveRun(data.run ?? null))
      .catch(() => setActiveRun(null));

    fetch("/api/classes")
      .then((r) => r.json())
      .then((data) => {
        setClasses(data.classes ?? []);
        setSelectedClassId(data.selectedClass ?? "regular");
      })
      .catch(() => {});
  }, [status]);

  async function selectClass(classId: string) {
    if (savingClass) return;
    setSelectedClassId(classId);
    setSavingClass(true);
    try {
      await fetch("/api/classes/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId }),
      });
    } finally {
      setSavingClass(false);
    }
  }

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

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <main className="min-h-screen flex flex-col items-center p-6 md:p-10 pt-12">
      <div className="w-full max-w-2xl flex flex-col gap-6">

        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Start a run</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Answer correctly to earn money. Wrong answers cost a life. Survive as long as you can.
          </p>
        </div>

        {/* Active run banner */}
        {activeRun && (
          <div className="rounded-xl border border-amber-500/40 bg-zinc-900/60 p-4">
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-2">
              Run in progress
            </p>
            <div className="flex gap-6 text-sm mb-3">
              <span><span className="text-red-400 font-bold">{activeRun.livesRemaining}</span> <span style={{ color: "var(--text-muted)" }}>lives</span></span>
              <span><span className="text-amber-400 font-bold">${activeRun.runMoney}</span> <span style={{ color: "var(--text-muted)" }}>run money</span></span>
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

        {/* ── Class Selector ─────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
            Choose your class
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {classes.map((cls) => {
              const colors = CLASS_COLORS[cls.color];
              const isSelected = selectedClassId === cls.id;
              const isLocked = !cls.unlocked;

              return (
                <button
                  key={cls.id}
                  onClick={() => !isLocked && selectClass(cls.id)}
                  disabled={isLocked}
                  className={`text-left rounded-xl border p-3 transition
                    ${isSelected
                      ? `${colors.border} ${colors.bg} ring-1 ring-inset ${colors.border}`
                      : isLocked
                        ? "border-zinc-800/40 bg-zinc-900/20 opacity-40 cursor-not-allowed"
                        : "border-zinc-700/40 bg-zinc-900/40 hover:border-zinc-600/60 hover:bg-zinc-800/40"
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`text-2xl leading-none mt-0.5 ${isLocked ? "grayscale" : ""}`}>
                      {isLocked ? "🔒" : cls.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`font-semibold text-sm ${isSelected ? colors.text : ""}`}>
                          {cls.name}
                        </span>
                        {isSelected && (
                          <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${colors.badge}`}>
                            Selected
                          </span>
                        )}
                      </div>
                      {isLocked ? (
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          🔒 {cls.unlockHint}
                        </p>
                      ) : (
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {cls.description}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected class passives detail */}
          {selectedClass && selectedClass.unlocked && selectedClass.passives.length > 0 && selectedClass.id !== "regular" && (
            <div className={`mt-3 rounded-lg border p-3 ${CLASS_COLORS[selectedClass.color].border} ${CLASS_COLORS[selectedClass.color].bg}`}>
              <p className={`text-xs font-semibold uppercase tracking-widest mb-1.5 ${CLASS_COLORS[selectedClass.color].text}`}>
                {selectedClass.icon} {selectedClass.name} passives
              </p>
              <ul className="space-y-1">
                {selectedClass.passives.map((p, i) => (
                  <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: "var(--text-muted)" }}>
                    <span className="mt-0.5 shrink-0">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── Start button ─────────────────────────────────────────────────────── */}
        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={startRun}
          disabled={starting}
          className="w-full px-8 py-3 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 font-semibold text-base transition"
        >
          {starting
            ? "Starting..."
            : activeRun
              ? `Abandon & start new run as ${selectedClass?.name ?? "Regular"}`
              : `Start run as ${selectedClass?.name ?? "Regular"}`}
        </button>

        <Link href="/" className="text-center text-sm hover:underline" style={{ color: "var(--text-muted)" }}>
          Back to home
        </Link>
      </div>
    </main>
  );
}
