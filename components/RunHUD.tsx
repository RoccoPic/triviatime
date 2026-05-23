function difficultyLabel(d: number): { label: string; className: string } {
  if (d <= 33) return { label: "Easy", className: "text-green-400" };
  if (d <= 66) return { label: "Medium", className: "text-yellow-400" };
  return { label: "Hard", className: "text-red-400" };
}

import { getRelicById } from "@/lib/relics";

export function RunHUD({
  lives,
  runMoney,
  floor,
  encounterIndex,
  totalEncounters,
  floorCategoryName,
  playerDifficulty,
  shieldCount = 0,
  freezeCount = 0,
  moneyMultiplier = 1,
  hasFiftyFifty = false,
  hasHint = false,
  freeMulligan = 0,
  relics = [],
}: {
  lives: number;
  runMoney: number;
  floor: number;
  encounterIndex: number;
  totalEncounters: number;
  floorCategoryName: string;
  playerDifficulty: number;
  shieldCount?: number;
  freezeCount?: number;
  moneyMultiplier?: number;
  hasFiftyFifty?: boolean;
  hasHint?: boolean;
  freeMulligan?: number;
  relics?: string[];
}) {
  const diff = difficultyLabel(playerDifficulty);

  const effects: { label: string; color: string }[] = [];
  if (shieldCount > 0)      effects.push({ label: `Shield ×${shieldCount}`,  color: "text-blue-400" });
  if (freezeCount > 0)      effects.push({ label: `Freeze ×${freezeCount}`,  color: "text-cyan-400" });
  if (moneyMultiplier > 1)  effects.push({ label: "2× Money",                color: "text-amber-400" });
  if (hasFiftyFifty)        effects.push({ label: "50/50",                   color: "text-purple-400" });
  if (hasHint)              effects.push({ label: "Hint",                    color: "text-purple-400" });
  if (freeMulligan > 0)     effects.push({ label: `Skip ×${freeMulligan}`,   color: "text-green-400" });

  return (
    <div className="flex flex-col gap-2 p-4 bg-zinc-900/80 rounded-lg border border-zinc-700">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1">
            <span className="text-zinc-200 text-sm">Lives</span>
            <span className="font-bold text-red-400">{lives}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-zinc-200 text-sm">Run $</span>
            <span className="font-bold text-amber-400">{runMoney}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-zinc-200 text-sm">Floor</span>
            <span className="font-bold">{floor}</span>
            <span className="text-zinc-300 text-sm">({floorCategoryName})</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-zinc-200 text-sm">Difficulty</span>
            <span className={`font-bold ${diff.className}`}>{diff.label}</span>
          </div>
        </div>
        <div className="text-zinc-200 text-sm">
          Encounter {encounterIndex + 1} / {totalEncounters}
        </div>
      </div>

      {effects.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-zinc-700/60">
          {effects.map((e) => (
            <span key={e.label} className={`text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-800 ${e.color}`}>
              {e.label}
            </span>
          ))}
        </div>
      )}

      {relics.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-zinc-700/60">
          {relics.map((id) => {
            const r = getRelicById(id);
            if (!r) return null;
            return (
              <span
                key={id}
                title={`${r.name}: ${r.detail}`}
                className="text-base leading-none cursor-default"
              >
                {r.icon}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
