export const LIVES_START = 3;
export const RUN_MONEY_START = 0;
export const MONEY_PER_CORRECT = 15;
export const SKIP_COST = 28;
export const QUESTIONS_PER_FLOOR = 4;
export const STREAK_FOR_LIFE = 3;
export const COLLECTION_CONVERSION_RATE = 0.5; // 50% of run money at run end

// Difficulty score: 1–100, lower = easier. Correct → decrease, wrong → increase.
export const DIFFICULTY_SCORE_MIN = 1;
export const DIFFICULTY_SCORE_MAX = 100;
export const DIFFICULTY_STEP = 3;

// Difficulty-based tiering: floors use questions in these score bands (lower = easier).
// Floor 1 = easy, floor 2 = medium, floor 3+ = hard. Used to filter questions per floor.
export const DIFFICULTY_TIER_EASY_MAX = 40; // 1–40
export const DIFFICULTY_TIER_MEDIUM_MIN = 25;
export const DIFFICULTY_TIER_MEDIUM_MAX = 75;
export const DIFFICULTY_TIER_HARD_MIN = 60; // 60–100
