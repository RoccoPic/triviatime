import { getRelicById } from "@/lib/relics";

function difficultyLabel(d: number): { label: string; color: string } {
  if (d <= 33) return { label: "Easy",   color: "#4ade80" };
  if (d <= 66) return { label: "Medium", color: "#fbbf24" };
  return              { label: "Hard",   color: "#f87171" };
}

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
  comboCount = 0,
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
  comboCount?: number;
}) {
  const diff = difficultyLabel(playerDifficulty);
  const comboMult = comboCount >= 4 ? "2×" : "1.5×";

  const effects: { label: string; color: string }[] = [];
  if (comboCount >= 2)     effects.push({ label: `🔥 ${comboCount}-streak · ${comboMult} money`, color: "#fb923c" });
  if (shieldCount > 0)     effects.push({ label: `🛡 Shield ×${shieldCount}`,   color: "#60a5fa" });
  if (freezeCount > 0)     effects.push({ label: `❄ Freeze ×${freezeCount}`,   color: "#67e8f9" });
  if (moneyMultiplier > 1) effects.push({ label: "2× money",                    color: "#d6a04a" });
  if (hasFiftyFifty)       effects.push({ label: "50/50 ready",                 color: "#c084fc" });
  if (hasHint)             effects.push({ label: "Hint ready",                  color: "#c084fc" });
  if (freeMulligan > 0)    effects.push({ label: `Skip ×${freeMulligan}`,       color: "#4ade80" });

  const heartsDisplay = Array.from({ length: Math.min(lives, 8) }, (_, i) => i < lives ? "❤" : "♡");

  return (
    <div
      className="flex flex-col gap-2 px-4 py-3 rounded-xl"
      style={{
        background: "rgba(255,255,255,0.035)",
        border: "1px solid rgba(214,160,74,0.18)",
        fontFamily: "var(--font-body, system-ui, sans-serif)",
      }}
    >
      {/* Main stats row */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
        <div className="flex items-center gap-5 flex-wrap">
          {/* Hearts */}
          <span
            className="text-sm tracking-wide"
            style={{ color: "#f87171", fontFamily: "var(--font-mono, monospace)" }}
            title={`${lives} lives remaining`}
          >
            {heartsDisplay.join("")}
          </span>

          {/* Run money */}
          <span
            className="text-sm font-semibold"
            style={{ color: "#d6a04a", fontFamily: "var(--font-mono, monospace)" }}
          >
            ${runMoney}
          </span>

          {/* Floor & category */}
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            Floor&nbsp;<strong style={{ color: "var(--text-page)" }}>{floor}</strong>
            {floorCategoryName && (
              <> · <span style={{ color: "var(--text-muted)" }}>{floorCategoryName}</span></>
            )}
          </span>

          {/* Difficulty */}
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              color: diff.color,
              background: `${diff.color}18`,
              border: `1px solid ${diff.color}40`,
            }}
          >
            {diff.label}
          </span>
        </div>

        {/* Encounter counter */}
        <span
          className="text-xs tabular-nums"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          {encounterIndex + 1}&nbsp;/&nbsp;{totalEncounters}
        </span>
      </div>

      {/* Active effects */}
      {effects.length > 0 && (
        <div
          className="flex flex-wrap gap-1.5 pt-1.5"
          style={{ borderTop: "1px solid rgba(214,160,74,0.12)" }}
        >
          {effects.map((e) => (
            <span
              key={e.label}
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ color: e.color, background: `${e.color}14`, border: `1px solid ${e.color}33` }}
            >
              {e.label}
            </span>
          ))}
        </div>
      )}

      {/* Relics row */}
      {relics.length > 0 && (
        <div
          className="flex flex-wrap gap-1.5 pt-1.5"
          style={{ borderTop: "1px solid rgba(214,160,74,0.12)" }}
        >
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
