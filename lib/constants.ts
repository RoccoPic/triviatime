export const LIVES_START = 3;
export const RUN_MONEY_START = 0;
export const MONEY_PER_CORRECT = 15;
export const SKIP_COST = 28;
export const QUESTIONS_PER_FLOOR = 4;
export const STREAK_FOR_LIFE = 3;
export const COLLECTION_CONVERSION_RATE = 0.5;

// Question difficulty score: 1–100, lower = easier.
export const DIFFICULTY_SCORE_MIN = 1;
export const DIFFICULTY_SCORE_MAX = 100;
export const DIFFICULTY_STEP = 3;

// Player difficulty: unique per run, adapts after every answer.
export const PLAYER_DIFFICULTY_START = 50;
export const PLAYER_DIFFICULTY_STEP = 5;
export const PLAYER_DIFFICULTY_WINDOW = 25;

// In-run shop prices (spent from run money at the floor-clear rest stop)
export const SHOP_EXTRA_LIFE        = 45;
export const SHOP_SECOND_CHANCE     = 50;
export const SHOP_FIFTY_FIFTY       = 20;
export const SHOP_HINT              = 15;
export const SHOP_FREEZE_DIFFICULTY = 30;
export const SHOP_DOUBLE_DOWN       = 10;
export const SHOP_DIFFICULTY_RESET  = 30;
export const SHOP_CATEGORY_SWAP     = 35;
export const SHOP_CATEGORY_LOCK     = 25;
export const SHOP_MULLIGAN          = 40;
export const SHOP_FLOOR_PEEK        = 15;

// Collection shop prices (spent from collection money, permanent upgrades)
export const CSHOP_HEAD_START       = 300;
export const CSHOP_EXTRA_LIFE       = 600;
export const CSHOP_REDUCED_SKIP     = 350;
export const CSHOP_RESILIENCE       = 400;
export const CSHOP_LUCKY_STREAK     = 400;
export const CSHOP_MONEY_BONUS      = 250;
export const CSHOP_START_DIFFICULTY = 300;
export const CSHOP_ANSWER_SHIELD    = 500;
export const CSHOP_SECOND_WIND      = 700;
