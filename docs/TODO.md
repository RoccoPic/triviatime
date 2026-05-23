# To Do

Priority order top-to-bottom. Shipped items live in `SHIPPED.md`.

---

## 🔴 High Priority

### Daily Challenge
Everyone plays the same seeded run each day. Score is compared on a leaderboard. Resets at midnight. Huge driver of daily re-engagement. *(Slay the Spire / Isaac)*
- [ ] Date-based run seed for deterministic question order
- [ ] Leaderboard (daily scores per user)
- [ ] "Daily Challenge" button on home page
- [ ] Prevent replaying the same day's challenge

### Run Modifiers (Pre-Run Draft)
Before each run, offer 3 randomly drawn modifiers — player picks one. Mix of pure buffs, pure debuffs, and risk/reward swaps. Reshapes strategy from the very first decision. *(Balatro: Vouchers / FTL: Starting loadout)*
- [ ] Modifier definitions pool (10–20 total modifiers)
  - Examples: *Bloodthirsty* (2× money, wrong costs 2 lives), *Scholar's Burden* (difficulty never decreases, +$5/correct), *Miser's Deal* (skip free, correct earns only $5), *Reckless Pace* (+1 question/node, +$10/node clear), *Amnesia* (no tools, 6 start lives)
- [ ] Store active modifier ID on the Run model
- [ ] Apply modifier effects throughout the run (startRun, recordAnswer, recordSkip, etc.)
- [ ] Display active modifier in HUD as a small pill/chip
- [ ] Modifier pick screen shown after class selection, before run starts

### Stats & Run History ✅ SHIPPED
*(See SHIPPED.md #17)*

---

## 🟡 Medium Priority

### Ascension System
After winning a run with a class, that class's Ascension level permanently increases by 1. Each level stacks a new handicap making future runs harder but implying mastery. Gives dedicated players a ladder to climb. *(Slay the Spire: Ascension 1–20)*
- [ ] `ascensionLevel` per class tracked on the User model (JSON or separate table)
- [ ] Ascension definitions (~10 levels): +1 question/node, -1 start life, shops cost more, difficulty resets on wave start, wrong answers raise difficulty by 8, etc.
- [ ] Apply stacked ascension modifiers in `startRun`
- [ ] Show current ascension level on class selector and HUD
- [ ] Ascension badge on achievements/profile page

### Curses (Mid-Run)
Certain events, elite defeats, or boss encounters add a persistent negative effect to the current run. Distinct from pre-run modifiers — these are forced on you mid-run. *(Slay the Spire: Curse cards)*
- [ ] Curse definitions (6–10 total): *Hexed* (forced random question before each skip), *Brittle* (shields don't refresh between floors), *Burden* (shop prices +$15), *Doubt* (one wrong per floor secretly forgiven but earns $0), *Fog* (answer order shuffled each question)
- [ ] Store active curses as JSON array on Run
- [ ] Curse-granting events: losing event choices, some elite clears, optional boss curse offer for a bonus relic
- [ ] Display active curses in HUD (icons with tooltip)

### Relic Synergies
Certain relic pairs activate a hidden bonus when both are held simultaneously. Rewards players who draft toward combos. *(Binding of Isaac: item interactions / Balatro: joker chains)*
- [ ] Define 6–8 synergy pairs in a lookup table
  - Examples: Scholar's Tome + Double-Edged Sword → every 5th correct earns 3× money; Iron Shield + Relentless Spirit → shields regenerate 1 per wave; Lucky Coin + Golden Fleece → boss floor proc rate 40%
- [ ] Check for active synergies in `recordAnswer` and `enterNode`
- [ ] Show synergy indicator in the relic section of HUD
- [ ] Synergy reveal moment (toast or glow effect) when second relic of a pair is picked

### Answer Explanations
After a wrong answer, show a one-sentence explanation of why the correct answer is right. Ties directly into the existing `citation` field on Question — Facts4U data powers this. Turns losing into learning. *(Unique to trivia roguelikes)*
- [ ] Show explanation panel after wrong answer is revealed (before next question loads)
- [ ] Pull from `citation` field on Question; fall back to "No explanation available" if null
- [ ] "Got it" button to dismiss and continue
- [ ] Optional: show for correct answers too (toggle in settings)

### Category Mastery
Track accuracy per category across all runs. Milestones unlock cosmetic badges and award collection money. Data already exists in the Answer table.
- [ ] Compute per-category accuracy on the progress page
- [ ] Define mastery tiers: Bronze 50%, Silver 70%, Gold 90%
- [ ] Store earned mastery on the User model (or derive from Answer data)
- [ ] Show mastery badges on the progress page
- [ ] Award collection money on first reaching each tier

### Challenge Runs
Pre-defined unusual configurations with fixed rules and their own achievements/badges on completion. *(Binding of Isaac: Challenges)*
- [ ] Challenge definitions: *Glass Cannon* (1 life, no shop, 3× money), *Ironman* (no skips, ever), *Specialist* (one category only, harder questions), *Speed Run* (45s timer per question), *Minimalist* (no relics, no shop, flat $10/correct)
- [ ] Challenge selection screen (separate from normal run)
- [ ] Each challenge has a unique completion achievement
- [ ] Store challenge ID on Run; apply its forced settings in `startRun`

### Wager System
Before a question loads the player can bet money on themselves. Win: 2× back. Lose: wagered amount lost on top of the normal penalty.
- [ ] "Place wager" UI before the question is revealed
- [ ] Wager options: $10, $25, $50, or a life wager
- [ ] Resolve in `recordAnswer`; reflect in result message

---

## 🟢 Lower Priority

### Boss Relics
After clearing a wave's final boss, offer one "boss relic" from a separate, more powerful pool — but every boss relic carries a real drawback. *(Slay the Spire: Boss relics)*
- [ ] Boss relic definitions (5–8): *Philosopher's Crown* (+$25/correct, wrong costs $15), *Blood Contract* (+1 life per boss cleared, max lives = 4), *Obsidian Lens* (50/50 always active, skip costs +$10)
- [ ] Offer boss relic at wave end (after regular wave_complete, before map wipe)
- [ ] Separate visual treatment from normal relic picks

### Heat System (Opt-In Modifiers)
Before starting, voluntarily stack extra handicaps. Each active modifier adds a multiplier to collection money earned — incentivising harder play without forcing it. *(Hades: Pact of Punishment)*
- [ ] Heat modifier definitions (similar to Ascension but opt-in per run)
- [ ] Heat level shown on run summary and leaderboard
- [ ] Collection money bonus scales with total heat

### Unlockable Starting Items
Complete specific challenges or reach certain milestones to unlock a permanent optional starting item for future runs (selected alongside class at run start). *(Meta-progression — Isaac / Hades)*
- [ ] Starting item definitions: *Lucky Charm* (start with Lucky Coin relic), *War Paint* (start 2 shields), *Crammer's Notes* (start with 1 hint), *Head Start Kit* (start $60)
- [ ] Unlock conditions tied to existing achievements or new milestones
- [ ] Starting item picker on run lobby (optional selection)

### Floor Modifiers
Each node rolls a random rule twist shown before you enter. Adds moment-to-moment variety without new content. *(FTL: random events)*
- [ ] Roll a modifier per node on entry (stored or derived from seed)
- [ ] Example modifiers: Double money, No skips this node, Correct streak heals at 5, All questions one tier harder, First question free (no life risk)
- [ ] Display active modifier on the node encounter screen

### Question Bookmarking
"Learn more" button on any question — saves it to a personal study list visible in your profile. Builds on the existing citation/explanation system.
- [ ] Bookmark button on encounter screen
- [ ] `UserBookmark` table (userId, questionId)
- [ ] Bookmarks page: question text, correct answer, citation link

### Leaderboard (Global)
Global or friends leaderboard: highest wave, best single-run score, most collection money. Requires no gameplay changes — sorted queries on existing data.
- [ ] Global leaderboard page
- [ ] Filter by: all-time / this week / by class
- [ ] Opt-out toggle in settings (privacy)

### Timed Mode
Optional per-run toggle. Each question has a countdown timer. Running out of time counts as wrong; answering fast earns a bonus.
- [ ] Timer toggle at run start
- [ ] Per-question countdown (base 20s; boss questions get more)
- [ ] Bonus money for fast answers (sub-5s → +$10)
- [ ] Store timer setting on Run model

### Stress Mechanic
A hidden stress bar (0–100) that fills on wrong answers, skips, and curses. At high stress debuffs kick in; relieve it at rest stops. *(Darkest Dungeon)*
- [ ] Add `stressLevel` to Run model
- [ ] Stress increases: wrong answer (+10), skip (+5), cursed floor (+15)
- [ ] Stress decreases: rest stop (spend money or a life)
- [ ] Debuffs at high stress: options shuffle, hints cost more, skip cost rises
- [ ] Stress bar in HUD

---

## 🎨 Production / Polish

### Audio
- [ ] Background music per screen (home, shop, game over, boss floor)
- [ ] Per-category in-run music tracks
- [ ] Sound effects: correct, wrong, life lost, shop purchase, relic pick, achievement unlock
- [ ] Audio manager with master/music/SFX volume controls
- [ ] Persist volume to localStorage

### Monster Art
- [ ] Decide art style (pixel art / illustrated / AI-generated)
- [ ] One image per monster entry (~200+ across all categories) in `/public/monsters/`
- [ ] Display on encounter screen; fallback placeholder for missing entries
- [ ] Animated sprites or idle animations for bosses

### Settings — Locked Content
- [ ] Lock background themes behind collection money purchases
- [ ] Lock topic categories behind collection money purchases
