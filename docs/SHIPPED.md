# Shipped Features

Features in ship order, oldest first.

---

## 1. Adaptive Difficulty
**Shipped:** May 20, 2026

Per-player difficulty score (0–100) that adjusts after every answer. Correct answers nudge it up; wrong answers nudge it down. Question selection uses a sliding window around the player's current difficulty score so the game always feels appropriately challenging without becoming impossible.

---

## 2. In-Run Shop
**Shipped:** May 20, 2026

Between-floor shop with 11 purchasable power-ups that last the current run: Extra Life, Second Chance (shield), 50/50, Hint, Freeze Difficulty, Double Down (2× money), Difficulty Reset, Category Swap, Category Lock, Mulligan (free skip), and Floor Peek. Items are bought with run money earned from correct answers.

---

## 3. Collection Shop
**Shipped:** May 20, 2026

Persistent meta-progression shop with 9 permanent upgrades purchased with collection money (earned by completing runs). Upgrades survive across runs and give long-term goals beyond any single session.

---

## 4. Rest Stop & Floor-Clear Screen
**Shipped:** May 21, 2026

Dedicated screen shown after clearing a battle node. Displays current lives, run money, and difficulty. Gives the player a moment to breathe and buy shop items before returning to the map.

---

## 5. Branching Map (Slay the Spire-style)
**Shipped:** May 20, 2026

Replaced linear floors with a fully generated branching node map. Each run generates a unique layout of 6–10+ columns with multiple parallel paths. Node types: Battle ⚔, Elite ♛, Boss ☠, Shop ✦, Rest ❤, Event ?. The player chooses their path through the map, with the full route visible. Includes an animated dragon token that glides to the selected node before the screen transitions. Dynamic layout scaling for wider wave maps.

---

## 6. Event Rooms
**Shipped:** May 21, 2026

Random narrative rooms that appear between floors. Each event presents a short scenario with 2–3 choices, each with meaningful trade-offs (costs, requirements, and effects). Outcomes feed back into run state — money gained/lost, lives changed, difficulty shifted. Unlocks a richer story layer without requiring new question content.

---

## 7. Background Themes & Custom Cursor
**Shipped:** May 15, 2026

Cosmetic customisation in Settings. Players can choose from multiple background themes (including a stone wall texture) that persist across sessions via localStorage. Theme colours propagate to text and UI via CSS variables. A cursor picker lets players choose from several custom cursor styles (default, pointer, crosshair, and more).

---

## 8. Wave Progression System
**Shipped:** May 21, 2026

When a player clears all nodes on a map they reach the Wave Complete screen instead of immediately ending the run. They can choose to **Progress** (advance to the next wave — bigger map, harder questions, more questions per battle) or **Cash Out** (convert 100% of run money to collection money and end the run cleanly). Wave number is tracked and displayed in the HUD. The `relentless-spirit` relic grants +1 life on each wave advance.

---

## 9. No-Repeat Questions
**Shipped:** May 21, 2026

Two layers of question deduplication. Within a run, every question that has already been seen is hard-excluded from future draws. Across runs, the last 3 completed runs' question IDs are tracked as soft excludes — the engine tries to avoid them but falls back gracefully if the pool is too small. A 4-level cascade (window + hard excludes → window + soft excludes → full difficulty band → any question) ensures the game never stalls even for small question pools.

---

## 10. Shop → Shop Map Rule
**Shipped:** May 21, 2026

Map generation now prevents shop nodes from linking directly to other shop nodes. The edge-building pass first tries to connect shop nodes only to non-shop targets; the coverage guarantee pass does the same. The constraint degrades gracefully if no alternative exists.

---

## 11. Boss Nodes
**Shipped:** May 21, 2026

The final column of every generated map is always a boss node (☠). Each category has a unique named boss with a title and flavour dialogue shown on a full-screen intro card before the first question. Boss floors have 2 extra questions compared to normal battles (capped at 8). Clearing a boss always offers a relic pick.

---

## 12. Relics
**Shipped:** May 21, 2026

12 passive run items that drop from boss and elite clears. Players choose one from 3 random options. Relics persist across wave progressions within the same run and reset when a new run starts. Each relic has a distinct mechanical effect wired throughout the game engine:

| Relic | Effect |
|---|---|
| 📚 Scholar's Tome | +$8 on every correct answer |
| 🛡 Iron Shield | +1 shield charge on every node entry |
| ⚗ Philosopher's Stone | Earn $7 even on wrong answers |
| 🧘 Hardened Mind | Difficulty is capped at 70 (Medium-Hard) |
| ⚡ Adrenaline Rush | Wrong answers no longer raise difficulty |
| ✨ Golden Fleece | 2× money on every boss floor |
| 🔮 Vampire's Fang | Life steal triggers after only 2-streak (down from 3) |
| 🍀 Lucky Coin | 25% chance each correct answer earns 2× money |
| ⚔ Double-Edged Sword | 2× money on correct answers; wrong answers cost $10 |
| 🐱 Cat's Paw | Grants one Second Wind (absorb a game-over hit) |
| 💰 Bargain Hunter | Shop items cost 20% less |
| 💪 Relentless Spirit | Gain +1 life on each wave progression |

Relics are displayed as icon tooltips in the RunHUD during every battle.

---

## 13. Combo Multiplier
**Shipped:** May 23, 2026

Consecutive correct answers build a streak multiplier. 2–3 in a row earns 1.5× money; 4+ earns 2×. Wrong answers or skips reset the counter to zero. The combo is tracked on the Run model (`comboCount`) and displayed as an 🔥 chip in the RunHUD. Multiplier is applied after all relic effects and stacks cleanly with Double-Edged Sword, Golden Fleece, Lucky Coin, and Scholar's Tome.

---

## 14. Save State / Run Resume
**Shipped:** May 23, 2026

Players can close the tab mid-run and return to exactly where they left off. `GET /api/run/active` returns any in-progress run for the lobby to surface. The `getRunEncounter` function now returns `floor_clear`, `relic_pick`, and `wave_complete` states (instead of null) when a floor is already finished, so the frontend restores the correct screen on reload. Relic choices are deterministic — seeded from `runId + pendingRelicNodeId` via `pickRelicsDeterministic` — so refreshing can't reroll the offer. The run lobby shows an amber "Run in progress" card with stats and a "Continue run →" button.

---

## 15. Achievements
**Shipped:** May 23, 2026

16 one-time milestone achievements across 7 categories (Bronze / Silver / Gold tiers) with a gallery page at `/achievements`. Achievements are checked server-side at every answer, wave advance, relic pick, and run end — fully idempotent. A `lowestLives` field on Run tracks whether the player ever dropped to 1 life (used for Comeback Kid and Survivor). Mid-run unlock toasts appear bottom-right and auto-dismiss after 4 seconds.

| Achievement | Unlock condition |
|---|---|
| ⚔️ Into the Fray | Complete any run |
| 🏆 Victorious | Win your first run |
| 🧠 Curious Mind | 10 correct in one run |
| 📖 Scholar | 25 correct in one run |
| 🎓 Mastermind | 50 correct in one run |
| 🔥 On Fire | 5-answer streak |
| ⚡ Unstoppable | 10-answer streak |
| 💰 Loaded | $200 run money at once |
| 🏺 Relic Hunter | 3 relics in one run |
| 🔮 Relic Hoarder | 5 relics in one run |
| 🌊 Wave Rider | Reach Wave 2 |
| ⛈️ Storm Chaser | Reach Wave 3 |
| 💀 Barely Made It | Win with exactly 1 life |
| 💪 Comeback Kid | Win after dropping to 1 life |
| ✨ Flawless | Win with no wrong answers |
| 🎯 No Shortcuts | Win without skipping |

---

## 16. Class System
**Shipped:** May 23, 2026

7 classes with distinct starting bonuses and passive mechanics. Regular is always available; the other 6 are locked behind specific achievements, giving players long-term progression goals beyond collection money.

| Class | Unlock | Passives |
|---|---|---|
| 🧑 Regular | Always | No bonuses |
| 📚 Scholar | Victorious | Start diff 35, earn $20/correct |
| ⚔️ Warrior | Scholar (25 correct) | +1 start life, +1 shield per battle entry |
| 💰 Merchant | Loaded ($200 in a run) | Start $40, shop 20% off |
| 🗡️ Rogue | On Fire (5-streak) | Skip $12, 2 free skips, skip keeps combo |
| 🔮 Mystic | Flawless win | Start diff 25, begin with 50/50, life at 2-streak |
| 🔥 Berserker | Storm Chaser (Wave 3) | 5 start lives, 2× money, wrong costs 2 lives |

Class passives are enforced throughout `lib/run.ts`: Warrior's shield fires in `enterNode`, Merchant's discount in `purchaseShopItem`, Rogue's combo preservation in `recordSkip`, Berserker's double life loss via a `livesPerWrongAnswer` field on Run. When a qualifying achievement is earned, the corresponding class is automatically unlocked as a side effect. Class selection UI lives on the run lobby page with color-coded cards and a passives detail panel.

---

## 17. Stats & Run History
**Shipped:** May 23, 2026

Full redesign of `/progress` and the run game-over screen.

**Progress page** (`/app/progress`):
- **Career stats row**: Total Runs, Wins, Win Rate (color-coded green/yellow/red), Best Score, Best Wave, Most $ in a run, Best Class (most wins).
- **Run History tab**: Each run shows class icon + name, win/loss badge, score, wave, ✓ correct / ✗ wrong / ↷ skipped counts, relative timestamp, run money, and all relic icons in a mini tray.
- **Category Stats tab**: Horizontal fill bars per category sorted by total answers, color-coded emerald (90%+) → green → yellow → red (<50%). Accuracy legend included.

**Game-over / Run Summary page** (`/run/[runId]/game-over`):
- Win/Loss/Ended outcome header with class name, wave, and run duration.
- Stat grid: Score, Floors, Lives left.
- Answer breakdown: Correct, Wrong, Skipped, Accuracy %.
- Collection money earned callout (+$X).
- Relic gallery showing every relic earned with icon + name.

**API** (`/api/progress`): now returns enriched `career` object, per-run `correct/wrong/skipped` counts, `relics`, `wave`, `won`, `runClass`, and full `name` for categories. `/api/run/[runId]` game-over branch now joins answer counts and full run metadata.
