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
