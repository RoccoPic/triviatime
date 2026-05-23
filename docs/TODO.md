# To Do

Priority order top-to-bottom. Shipped items live in `SHIPPED.md`.

---

## 🔴 High Priority

### Combo Multiplier
Consecutive correct answers build a multiplier that increases money earned. One wrong answer resets it. High engagement impact, small scope.
- [ ] Track `comboCount` on the Run model
- [ ] Multiplier tiers: 1 (1×), 2–3 (1.5×), 4+ (2×)
- [ ] Display combo streak in the HUD
- [ ] Reset on wrong answer or skip

### Daily Challenge
Everyone plays the same seeded run each day. Score is compared on a leaderboard. Resets at midnight. Huge driver of daily re-engagement.
- [ ] Date-based run seed for deterministic question order
- [ ] Leaderboard (daily scores per user)
- [ ] "Daily Challenge" button on home page
- [ ] Prevent replaying the same day's challenge

### Achievements
One-time milestone badges that award collection money and give players long-term goals.
- [ ] Achievement model (or JSON field on User)
- [ ] Example achievements: First Win, 10-Correct Streak, Clear 20 Floors, Buy Every Upgrade, Play 50 Runs
- [ ] Achievement check logic (run on answer / run-end events)
- [ ] Achievements page / modal showing earned vs locked
- [ ] Collection money reward on unlock

### Category Mastery
Track accuracy per category across all runs. Milestones unlock cosmetic badges and award collection money. The data is already collected in the Answer table — this is mostly UI.
- [ ] Compute per-category accuracy on the progress page
- [ ] Define mastery tiers: Bronze 50%, Silver 70%, Gold 90%
- [ ] Store earned mastery on the User model (or derive from Answer data)
- [ ] Show mastery badges on the progress page
- [ ] Award collection money on first reaching each tier

---

## 🟡 Medium Priority

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

### Wager System
Before a question loads, the player can bet lives or money. Win: 2× bet back. Lose: wagered amount lost on top of the normal penalty.
- [ ] "Place wager" UI before the question is revealed
- [ ] Wager options: small ($10), medium ($25), life
- [ ] Resolve wager in `recordAnswer` and reflect in result message

### Run Modifiers / Curses
At run start the player can optionally accept a curse in exchange for boosted rewards. Classic roguelike risk/reward.
- [ ] Curse selection screen before a run starts
- [ ] Example curses: Skip disabled (2× money), Start with 1 life (3× collection conversion), No shop (1.5× money), Hard difficulty locked (2× collection conversion)
- [ ] Store active modifier on the Run model
- [ ] Apply modifier effects throughout the run

### Floor Modifiers
Each floor rolls a random rule twist shown before you enter. Adds moment-to-moment variety without new content.
- [ ] Roll a modifier per floor on floor start (stored on Run or derived from seed)
- [ ] Example modifiers: Double money, No skips, Questions cost $5 to reveal, Correct streak heals at 5, All questions one difficulty tier harder
- [ ] Display active modifier in the HUD and on the floor intro screen

### Timed Mode
Optional per-run toggle. Each question has a countdown timer. Answering faster earns bonus money; running out of time counts as a wrong answer.
- [ ] Timer toggle at run start (opt-in)
- [ ] Per-question countdown (e.g. 20 seconds; harder questions get more time)
- [ ] Bonus money for fast answers (e.g. under 5s → +$10)
- [ ] Store timer setting on the Run model

---

## 🟢 Lower Priority

### Audio
Music and sound design across the whole game.

#### Screen music
- [ ] Home screen background music
- [ ] Settings screen music
- [ ] Shop screen music
- [ ] Game over screen music

#### In-run music
- [ ] Each topic category has its own background track during its floor
- [ ] Rest stop / floor clear screen music (calm interlude)
- [ ] Boss floor music (tense, distinct from normal)
- [ ] Music fades or transitions smoothly between screens

#### Implementation
- [ ] Audio manager / context to handle play, pause, volume, and transitions globally
- [ ] Volume control in Settings (master, music, SFX separately)
- [ ] Persist volume preferences to localStorage
- [ ] Sound effects: correct answer, wrong answer, life lost, shop purchase, run complete

### Monster Art
Each monster in the monster list needs a unique image. Currently monsters are text-only.
- [ ] Decide on art style (pixel art, illustrated, AI-generated, etc.)
- [ ] Create or source one image per monster entry (~200+ images across all categories)
- [ ] Store images in `/public/monsters/` named by slug + index (e.g. `astronomy-0.png`)
- [ ] Display monster image on the encounter screen alongside the monster title
- [ ] Fallback placeholder image for any missing entries
- [ ] Consider animated sprites or idle animations for boss floor monsters

### Settings — Locked Content
- [ ] Lock background themes behind collection money purchases (currently free)
- [ ] Lock topic categories behind collection money purchases (currently free)

### Stress Mechanic (Darkest Dungeon-style)
A hidden stress bar that fills on wrong answers, skips, and cursed floors. At high stress, debuffs kick in. Relieve stress at rest stops.
- [ ] Add `stressLevel` (0–100) to the Run model
- [ ] Stress increases on: wrong answer (+10), skip (+5), cursed floor modifier (+15)
- [ ] Stress decreases at rest stop (spend money or a life to reduce)
- [ ] Debuffs at high stress: answer options shuffle, hints cost more, skip cost rises
- [ ] Stress bar displayed in HUD

### Curse + Blessing Drafts
At run start, present 3 random curse/blessing pairs. Each curse penalises you but comes with a compensating blessing — players opt into risk and build a run identity.
- [ ] Curse/blessing pair definitions (curse effect + blessing effect as a package)
- [ ] Example pairs:
  - No shop floors + start with $80 and a free Extra Life
  - Questions from hardest difficulty only + 3× collection money conversion
  - No skips + every correct answer earns a life at 10-streak
  - Timer on every question (15s) + correct answers earn double money
- [ ] Draft UI at run start (pick 0, 1, or more pairs)
- [ ] Store active curses/blessings on the Run model and apply throughout
