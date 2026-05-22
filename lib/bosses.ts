// ─── Boss definitions ─────────────────────────────────────────────────────────
// One boss per category slug. getBossForCategory() falls back gracefully.

export type BossDef = {
  slug: string;
  name: string;
  title: string;
  dialogue: string;
  icon: string;
};

export const BOSSES: BossDef[] = [
  {
    slug: "algebra",
    name: "The Variable",
    title: "Master of the Unknown",
    icon: "𝑥",
    dialogue:
      "You seek to solve me? I am not so simple. Every equation has a solution — but finding it requires more than luck. Show me your work.",
  },
  {
    slug: "ancient-egypt",
    name: "Khem-Ra",
    title: "Warden of the Eternal Sands",
    icon: "𓂀",
    dialogue:
      "Thousands of years have I watched empires crumble to dust. You are but a breath of wind against the pyramids. Prove yourself worthy of passing.",
  },
  {
    slug: "ancient-rome",
    name: "Maximus Vix",
    title: "Champion of the Eternal City",
    icon: "🦅",
    dialogue:
      "Rome was not built in a day — and neither was my knowledge of it. The Senate may have fallen, but I have not. Alea iacta est.",
  },
  {
    slug: "architecture",
    name: "The Grand Architect",
    title: "Builder of Worlds",
    icon: "🏛",
    dialogue:
      "I have drawn the blueprints of cathedrals and coliseums. Every structure tells a story. Let us see if your foundations are as sound as mine.",
  },
  {
    slug: "art",
    name: "The Maestro",
    title: "Painter of Realities",
    icon: "🎨",
    dialogue:
      "Beauty is my weapon and knowledge is my shield. Many have tried to critique my work. All have left humbled. Your canvas awaits.",
  },
  {
    slug: "art-movements",
    name: "The Avant-Garde",
    title: "Shepherd of Shifting Styles",
    icon: "🖼",
    dialogue:
      "From Baroque to Brutalism, I have lived through every movement, every manifesto, every revolution in form. Do you think you can keep up?",
  },
  {
    slug: "astronomy",
    name: "Stellara",
    title: "Keeper of the Cosmos",
    icon: "🌌",
    dialogue:
      "I have watched galaxies form and die across eons. Your brief existence is but a flicker of starlight. Impress me before it fades.",
  },
  {
    slug: "biology",
    name: "The Cell Lord",
    title: "Master of Living Things",
    icon: "🧬",
    dialogue:
      "Life itself bends to my understanding. From the smallest microbe to the mightiest beast — every organism is my domain. Can you say the same?",
  },
  {
    slug: "botany",
    name: "The Thornwarden",
    title: "Keeper of the Green Kingdom",
    icon: "🌿",
    dialogue:
      "The forest whispers secrets only I can hear. My roots run deeper than you know. Can you navigate my thicket without getting lost?",
  },
  {
    slug: "calculus",
    name: "The Infinite",
    title: "Sovereign of Limits",
    icon: "∞",
    dialogue:
      "You approach me as a limit approaches its value — slowly, uncertainly. Let us find out whether your understanding converges... or diverges entirely.",
  },
  {
    slug: "chemistry",
    name: "The Alchemist",
    title: "Transmuter of Elements",
    icon: "⚗",
    dialogue:
      "I have turned lead into gold and poison into medicine. Every reaction has a consequence. Let us see if you can keep up with mine.",
  },
  {
    slug: "cinematography",
    name: "The Director",
    title: "Auteur of Illusions",
    icon: "🎬",
    dialogue:
      "Lights. Camera. Action. I have been crafting stories since the first reel turned. Every frame is a decision. Think you can read my script?",
  },
  {
    slug: "cold-war",
    name: "The Phantom",
    title: "Shadow of the Iron Curtain",
    icon: "🕵",
    dialogue:
      "I operated in shadows for decades. Trust no one — every answer has a counter-answer. The game is never as simple as it appears on the surface.",
  },
  {
    slug: "countries",
    name: "The Cartographer",
    title: "Sovereign of All Borders",
    icon: "🗺",
    dialogue:
      "I have mapped every border, every coastline, every mountain range on this Earth. Name one place I do not know. I will wait.",
  },
  {
    slug: "earth-science",
    name: "The Tectonic",
    title: "Voice of the Deep Earth",
    icon: "🌋",
    dialogue:
      "I have watched continents drift for millions of years. Your civilization barely registers on my timeline. Shall we see what you know of my world?",
  },
  {
    slug: "famous-art",
    name: "The Curator",
    title: "Guardian of the Masterworks",
    icon: "🖼",
    dialogue:
      "I have personally verified the brushstrokes of the masters. One false attribution in my gallery and you are out. Choose your answers carefully.",
  },
  {
    slug: "food",
    name: "Chef Mortem",
    title: "Arbiter of Flavor",
    icon: "🍴",
    dialogue:
      "Every dish tells a story. Every ingredient has a history stretching back centuries. Think you know your way around my kitchen? Prove it.",
  },
  {
    slug: "forensics",
    name: "The Examiner",
    title: "Reader of the Dead",
    icon: "🔍",
    dialogue:
      "Evidence never lies — people lie. I have read the truth in silence more times than you have drawn breath. Let the evidence speak for you.",
  },
  {
    slug: "genetics",
    name: "The Helix",
    title: "Weaver of the Code",
    icon: "🧬",
    dialogue:
      "Every living thing is written in the same four letters — and I am fluent in all of it. Can you decode what I have written into existence?",
  },
  {
    slug: "geography",
    name: "The Wanderer",
    title: "Atlas of the World",
    icon: "🧭",
    dialogue:
      "I have crossed every mountain range and forded every river on this planet. Point to a place on the map — I will tell you its story before you blink.",
  },
  {
    slug: "geometry",
    name: "Euklides",
    title: "Ruler of Angles and Lines",
    icon: "📐",
    dialogue:
      "The universe itself is written in geometry. Points, lines, planes — perfect, unforgiving logic. Let us see if yours holds up under examination.",
  },
  {
    slug: "graphic-design",
    name: "The Pixel Warden",
    title: "Master of Visual Language",
    icon: "🖥",
    dialogue:
      "Every logo, every layout, every typeface is a deliberate choice. And choices have consequences. I have critiqued them all. Think carefully.",
  },
  {
    slug: "history",
    name: "The Chronicler",
    title: "Keeper of All That Was",
    icon: "📜",
    dialogue:
      "I have witnessed every war, every revolution, every moment that shaped what you call the present. History does not forgive forgetfulness.",
  },
  {
    slug: "human-anatomy",
    name: "The Surgeon",
    title: "Reader of Flesh and Bone",
    icon: "🫀",
    dialogue:
      "I have memorized every nerve, every vessel, every cavity in the human form. The body holds no secrets from me. Can you say the same?",
  },
  {
    slug: "impressionism",
    name: "Lumière",
    title: "Blur Between Moments",
    icon: "🌅",
    dialogue:
      "I do not paint what is there — I paint how it feels to be there. The light shifts, the moment passes. Let us see if you felt what I felt.",
  },
  {
    slug: "industrial-revolution",
    name: "The Ironmonger",
    title: "Lord of the Machine Age",
    icon: "⚙",
    dialogue:
      "Steam and steel built the modern world, and I was there at the forge. The soot never quite washes off. Were you paying attention in history class?",
  },
  {
    slug: "islands",
    name: "The Archipelago",
    title: "Sovereign of Scattered Lands",
    icon: "🏝",
    dialogue:
      "I am everywhere and nowhere at once — a thousand fragments of land surrounded by endless sea. To know me, you must know every last speck.",
  },
  {
    slug: "math",
    name: "The Abacus",
    title: "Ancient Keeper of Numbers",
    icon: "∑",
    dialogue:
      "Numbers do not lie. They do not bend to sentiment or fashion. They simply are. Can you match my precision, or will you flinch from the truth?",
  },
  {
    slug: "math-puzzles",
    name: "The Riddler",
    title: "Architect of Impossible Problems",
    icon: "🧩",
    dialogue:
      "Every puzzle has a solution — the question is whether you can find it under pressure. I have been designing traps for clever minds for centuries.",
  },
  {
    slug: "meteorology",
    name: "Stormcaller",
    title: "Master of Sky and Storm",
    icon: "⛈",
    dialogue:
      "I have summoned hurricanes and whispered through morning fog. The sky obeys my knowledge. Does yours reach as high as mine?",
  },
  {
    slug: "national-parks",
    name: "The Ranger",
    title: "Warden of the Wilderness",
    icon: "🌲",
    dialogue:
      "These lands were preserved for a reason. I have walked every trail, named every peak, catalogued every creature. How well do you know the wild?",
  },
  {
    slug: "oceans-seas",
    name: "The Leviathan",
    title: "Sovereign of the Deep",
    icon: "🌊",
    dialogue:
      "The oceans cover most of this world, yet most know so little of them. Step into my depths — if you truly dare to face what lives down here.",
  },
  {
    slug: "photography",
    name: "The Observer",
    title: "Capturer of Frozen Moments",
    icon: "📸",
    dialogue:
      "Every photograph is a moment stolen from time itself. I have captured millions. The question is — do you truly see, or do you merely look?",
  },
  {
    slug: "science",
    name: "The Empiricist",
    title: "Seeker of All Truths",
    icon: "🔬",
    dialogue:
      "I follow evidence wherever it leads, without fear or favor. No hypothesis survives contact with a well-designed experiment. Ready for yours?",
  },
  {
    slug: "sports",
    name: "The Champion",
    title: "The Undefeated",
    icon: "🏆",
    dialogue:
      "I have won every championship, broken every record, and outlasted every challenger who dared step into my arena. You are just the latest.",
  },
  {
    slug: "statistics",
    name: "The Oracle",
    title: "Prophet of Probability",
    icon: "📊",
    dialogue:
      "I never predict outcomes — I calculate them. Numbers never lie, but they mislead the careless. What are the odds you make it out of here?",
  },
  {
    slug: "technology",
    name: "AXIOM",
    title: "Neural Architect of the Digital Age",
    icon: "💻",
    dialogue:
      "Processing... challenger identified. Threat assessment: uncertain. I have indexed every innovation since the transistor. Initiating final exam.",
  },
  {
    slug: "trigonometry",
    name: "The Sine",
    title: "Lord of Waves and Angles",
    icon: "〜",
    dialogue:
      "All motion resolves into angles. All angles resolve into ratios. There is no escaping the elegance of my domain — nor the precision it demands.",
  },
  {
    slug: "us-states",
    name: "The Governor",
    title: "Warden of the Fifty",
    icon: "🦅",
    dialogue:
      "From sea to shining sea, I know every state, every capital, every border dispute. The union has no room for geographic ignorance. Prove yourself.",
  },
  {
    slug: "video-games",
    name: "The Final Boss",
    title: "Legendary High Score Holder",
    icon: "🎮",
    dialogue:
      "You think you can beat me? I am literally the final boss. This is what I was designed for. Insert coin. No continues.",
  },
  {
    slug: "world-capitals",
    name: "The Envoy",
    title: "Master of All Nations",
    icon: "🌐",
    dialogue:
      "Diplomacy demands precision — one wrong capital and treaties collapse. I have never been wrong. Can you maintain my perfect record?",
  },
  {
    slug: "world-war-1",
    name: "The General",
    title: "Ghost of the Western Front",
    icon: "⚔",
    dialogue:
      "The trenches hold memories no one should carry — but I carry them all. Mud, wire, and silence. Do you know what was fought for here?",
  },
  {
    slug: "world-war-2",
    name: "The Admiral",
    title: "Shadow of the Second Conflict",
    icon: "🪖",
    dialogue:
      "Across every theater of war, on every ocean and continent, I watched it all unfold. The world changed forever. Do not let it be forgotten.",
  },
];

const FALLBACK_BOSS: BossDef = {
  slug: "_fallback",
  name: "The Sage",
  title: "Keeper of Ancient Wisdom",
  icon: "📜",
  dialogue:
    "You dare challenge me? I have guarded this knowledge for centuries. Many have tried. None have left unscathed. Let us see what you are made of.",
};

export function getBossForCategory(categorySlug: string): BossDef {
  return BOSSES.find((b) => b.slug === categorySlug) ?? FALLBACK_BOSS;
}
