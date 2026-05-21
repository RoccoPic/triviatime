export const LIVES_START = 3;
export const RUN_MONEY_START = 0;
export const MONEY_PER_CORRECT = 15;
export const SKIP_COST = 28;
export const QUESTIONS_PER_FLOOR = 4;
export const STREAK_FOR_LIFE = 3;
export const COLLECTION_CONVERSION_RATE = 0.5; // 50% of run money at run end

// Question difficulty score: 1–100, lower = easier. Correct → decrease, wrong → increase.
export const DIFFICULTY_SCORE_MIN = 1;
export const DIFFICULTY_SCORE_MAX = 100;
export const DIFFICULTY_STEP = 3; // how much question difficulty shifts per answer

// Player difficulty: unique per run, adapts after every answer.
export const PLAYER_DIFFICULTY_START = 50;  // starting difficulty
export const PLAYER_DIFFICULTY_STEP = 5;    // how much it shifts per answer
export const PLAYER_DIFFICULTY_WINDOW = 25; // ±window around player difficulty for question selection
