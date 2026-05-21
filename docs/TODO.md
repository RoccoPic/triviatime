# To Do

## Done
- [x] Per-player adaptive difficulty (adjusts after every answer)
- [x] Between-floor rest stop / shop screen
- [x] In-run shop (11 items: Extra Life, Second Chance, 50/50, Hint, Freeze Difficulty, Double Down, Difficulty Reset, Category Swap, Category Lock, Mulligan, Floor Peek)
- [x] Collection shop (9 permanent upgrades bought with collection money)

---

## Settings / cosmetics
- [ ] Lock background themes behind collection money purchases (currently free)
- [ ] Lock topic categories behind collection money purchases (currently free)

---

## Audio
Music and sound design across the whole game.

### Screen music
- [ ] Home screen background music
- [ ] Settings screen music
- [ ] Shop screen music
- [ ] Game over screen music

### In-run music
- [ ] Each topic category has its own background track that plays during its floor (e.g. space ambience for Astronomy, war drums for World War 2, classical for Art)
- [ ] Rest stop / floor clear screen music (calm interlude between floors)
- [ ] Boss floor music (tense, distinct from normal floor music)
- [ ] Music fades or transitions smoothly between screens

### Implementation notes
- [ ] Audio manager / context to handle play, pause, volume, and transitions globally
- [ ] Volume control in Settings (master, music, SFX separately)
- [ ] Persist volume preferences to localStorage
- [ ] Sound effects: correct answer, wrong answer, life lost, shop purchase, run complete

---

## Art — Monster images
Each monster in the monster list needs a unique image. Currently monsters are text-only.
- [ ] Decide on art style (pixel art, illustrated, AI-generated, etc.)
- [ ] Create or source one image per monster entry (~200+ images across all categories)
- [ ] Store images in `/public/monsters/` named by slug + index (e.g. `astronomy-0.png`)
- [ ] Display monster image on the encounter screen alongside the monster title
- [ ] Fallback placeholder image for any missing entries
- [ ] Consider animated sprites or idle animations for boss floor monsters

---

## Big features

### Daily Challenge
Everyone plays the same seeded run each day. The seed is derived from the date so it's identical for all players. Score is compared on a leaderboard. Resets at midnight.
- [ ] Date-based run seed for deterministic question order
- [ ] Leaderboard (daily scores per user)
- [ ] "Daily Challenge" button on home page
- [ ] Prevent replaying the same day's challenge

### Run Modifiers / Curses
At run start the player can optionally accept a curse in exchange for boosted rewards. Classic roguelike risk/reward.
- [ ] Curse selection screen before a run starts
- [ ] Example curses: Skip disabled (2× money), Start with 1 life (3× collection conversion), No shop (1.5× money), Hard difficulty locked (2× collection conversion)
- [ ] Store active modifier on the Run model
- [ ] Apply modifier effects throughout the run

### Boss Floors
Every 5 floors is a boss floor with a single harder question. Getting it right gives a big reward; getting it wrong costs 2 lives.
- [ ] Detect boss floor (floor % 5 === 0)
- [ ] Boss floor UI (different styling, warning)
- [ ] Boss question: pull from high difficulty band (80–100)
- [ ] Reward: 3× money + bonus life on correct; −2 lives on wrong

### Combo Multiplier
Consecutive correct answers build a multiplier that increases money earned. One wrong answer resets it.
- [ ] Track `comboCount` on the Run model
- [ ] Multiplier tiers: 1 (1×), 2–3 (1.5×), 4+ (2×)
- [ ] Display combo streak in the HUD
- [ ] Reset on wrong answer or skip

### Category Mastery
Track accuracy per category across all runs. Hitting milestones (50 / 70 / 90 % correct) unlocks a cosmetic badge and awards collection money.
- [ ] Compute per-category accuracy on the progress page (data already collected in Answer table)
- [ ] Define mastery tiers (Bronze 50%, Silver 70%, Gold 90%)
- [ ] Store earned mastery on the User model (or derive from Answer data)
- [ ] Show mastery badges on the progress page
- [ ] Award collection money on first reaching each tier

### Achievements
One-time milestone badges that award collection money and give players long-term goals.
- [ ] Achievement model (or JSON field on User)
- [ ] Example achievements: First Win, 10-Correct Streak, Clear 20 Floors, Buy Every Upgrade, Play 50 Runs
- [ ] Achievement check logic (run on answer/run-end events)
- [ ] Achievements page / modal showing earned vs locked
- [ ] Collection money reward on unlock

---

## Gameplay ideas

### Wager System
Before a question loads, the player can bet lives or money that they'll answer correctly. Win: 2× the bet back. Lose: wagered amount lost on top of the normal wrong-answer penalty.
- [ ] "Place wager" UI before the question is revealed
- [ ] Wager options: small ($10), medium ($25), life
- [ ] Resolve wager in `recordAnswer` and reflect in result message

### Timed Mode
Optional per-run toggle. Each question has a countdown timer. Answering faster earns bonus money; running out of time counts as a wrong answer.
- [ ] Timer toggle at run start (opt-in)
- [ ] Per-question countdown (e.g. 20 seconds; harder questions get more time)
- [ ] Bonus money for fast answers (e.g. under 5s → +$10)
- [ ] Store timer setting on the Run model

### Floor Modifiers
Each floor rolls a random rule twist shown before you enter. Changes moment-to-moment strategy without requiring new content.
- [ ] Roll a modifier per floor on floor start (stored on Run or derived from seed)
- [ ] Example modifiers: Double money, No skips, Questions cost $5 to reveal, Correct streak heals at 5, All questions one difficulty tier harder
- [ ] Display active modifier in the HUD and on the floor intro screen

### Branching Map (Slay the Spire-style)
Replace linear floors with a small node map shown at run start. Players choose their path through different room types, making strategic risk decisions before each floor.
- [ ] Map generation: branching paths of 10–15 nodes across ~5 columns
- [ ] Node types: Normal floor, Elite floor (harder questions, bigger reward), Shop, Rest stop, Event room
- [ ] Render map UI with path selection before each floor
- [ ] Store chosen path on the Run model

### Event Rooms
Short text scenarios that appear between floors and offer meaningful choices. High personality, low content cost.
- [ ] Event definition format (title, description, 2–3 choices each with effects)
- [ ] Example events:
  - "A scholar offers to answer your next question for $40"
  - "Gamble: guess your next floor's category — right earns $60, wrong costs a life"
  - "A cursed tome lets you permanently remove one category from this run"
  - "A merchant sells a mystery item for $20 — could be anything"
- [ ] Event room screen UI
- [ ] Hook event outcomes into run state

### Relics
Passive items found in elite rooms and events that persist the whole run and stack to create interesting synergies. Inspired by Slay the Spire.
- [ ] Relic data model (id, name, description, effect type + value)
- [ ] Store active relics as JSON array on the Run model
- [ ] Apply relic effects at the relevant points in `recordAnswer` / `recordSkip` / floor start
- [ ] Example relics:
  - *Encyclopedia* — first question each floor has one wrong answer pre-eliminated
  - *Philosopher's Stone* — every 5th consecutive correct answer grants a free life
  - *Gambler's Coin* — correct answers earn 2× money, but wrong answers also cost $10
  - *Curse of Babel* — answer options shuffle each time, but money per correct is doubled
  - *Iron Will* — the first life lost each floor is absorbed (once per floor)
- [ ] Relic display in HUD

### Character Classes
Pick a "build" at run start that defines a passive playstyle bonus for the whole run.
- [ ] Class selection screen before run starts
- [ ] Example classes:
  - *Historian* — history/ancient categories appear more often, +$10 per correct answer
  - *Speed Demon* — 15-second timer per question; answer in under 5s for double money
  - *Tank* — start with 5 lives, earn money at half rate
  - *Scholar* — hint and 50/50 shop items cost 50% less
  - *Gambler* — all money rewards are randomized ±50%, start with an extra $50
- [ ] Store chosen class on the Run model
- [ ] Apply class modifiers throughout the run

### Stress Mechanic (Darkest Dungeon-style)
A hidden stress bar that fills on wrong answers, skips, and cursed floors. At high stress, debuffs kick in. Relieve stress at rest stops.
- [ ] Add `stressLevel` (0–100) to the Run model
- [ ] Stress increases on: wrong answer (+10), skip (+5), cursed floor modifier (+15)
- [ ] Stress decreases at rest stop (spend money or a life to reduce)
- [ ] Debuffs at high stress: answer options shuffle, hints cost more, skip cost rises
- [ ] Stress bar displayed in HUD

### Curse + Blessing Drafts
At run start, present 3 random curse/blessing pairs. Each curse penalizes you but comes with a compensating blessing — players opt into risk and build a run identity around it.
- [ ] Curse/blessing pair definitions (curse effect + blessing effect as a package)
- [ ] Example pairs:
  - No shop floors + start with $80 and a free Extra Life
  - Questions from hardest difficulty only + 3× collection money conversion
  - No skips + every correct answer earns a life at 10-streak
  - Timer on every question (15s) + correct answers earn double money
- [ ] Draft UI at run start (pick 0, 1, or more pairs)
- [ ] Store active curses/blessings on the Run model and apply throughout
