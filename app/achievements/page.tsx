import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserAchievements } from "@/lib/achievements";
import { ACHIEVEMENTS } from "@/lib/achievement-defs";
import type { AchievementTier } from "@/lib/achievement-defs";

const TIER_STYLES: Record<AchievementTier, { badge: string; ring: string }> = {
  bronze: { badge: "bg-amber-900/60 text-amber-400 border border-amber-700/50",   ring: "border-amber-700/40" },
  silver: { badge: "bg-zinc-700/60 text-zinc-200 border border-zinc-500/50",       ring: "border-zinc-500/40" },
  gold:   { badge: "bg-yellow-900/60 text-yellow-300 border border-yellow-600/50", ring: "border-yellow-600/40" },
};

export default async function AchievementsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/achievements");

  const achievements = await getUserAchievements(session.user.id);
  const earned = achievements.filter((a) => a.earned).length;
  const total  = ACHIEVEMENTS.length;

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Achievements</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {earned} / {total} unlocked
            </p>
          </div>
          <Link href="/" className="text-sm hover:underline" style={{ color: "var(--text-muted)" }}>
            ← Home
          </Link>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full bg-zinc-800 mb-8 overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-500 transition-all"
            style={{ width: `${(earned / total) * 100}%` }}
          />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {achievements.map((ach) => {
            const styles = TIER_STYLES[ach.tier];
            const locked = !ach.earned;
            return (
              <div
                key={ach.id}
                className={`rounded-xl border p-4 flex gap-4 items-start transition ${
                  locked
                    ? "opacity-45 border-zinc-700/30 bg-zinc-900/30"
                    : `${styles.ring} bg-zinc-900/60`
                }`}
              >
                {/* Icon */}
                <div className={`text-3xl leading-none mt-0.5 select-none ${locked ? "grayscale" : ""}`}>
                  {locked ? "🔒" : ach.icon}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-semibold text-sm">{ach.name}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${styles.badge}`}>
                      {ach.tier}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {ach.description}
                  </p>
                  {ach.earnedAt && (
                    <p className="text-[10px] mt-1 text-amber-500/70">
                      Earned {new Date(ach.earnedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
