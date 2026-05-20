export const BACKGROUND_THEME_KEY = "trivia-bg";

const THEME_IDS = [
  "zinc", "slate", "stone", "neutral", "amber", "rose", "fuchsia", "crimson", "scarlet", "ruby",
  "coral", "salmon", "peach", "tangerine", "apricot", "orange", "gold", "honey", "mustard", "lemon",
  "yellow", "chartreuse", "lime", "mint", "jade", "emerald", "forest", "pine", "sage", "olive",
  "moss", "teal", "cyan", "aqua", "turquoise", "sky", "azure", "cerulean", "cobalt", "navy",
  "sapphire", "royal", "indigo", "violet", "purple", "plum", "lavender", "mauve", "orchid", "magenta",
  "wine", "burgundy", "maroon", "cherry", "raspberry", "strawberry", "watermelon", "blush", "pink",
  "bubblegum", "flamingo", "carnation", "mahogany", "copper", "bronze", "rust", "sienna", "umber",
  "chocolate", "coffee", "espresso", "mocha", "cocoa", "taupe", "beige", "tan", "sand", "cream",
  "ivory", "pearl", "silver", "platinum", "steel", "graphite", "charcoal", "ash", "smoke", "fog",
  "canary", "butter", "dandelion", "sunflower", "goldenrod", "saffron", "marigold", "banana",
] as const;

export type BackgroundThemeId = (typeof THEME_IDS)[number];

/** Hex background color per theme id (must match app/globals.css). */
export const BACKGROUND_THEME_COLORS: Record<BackgroundThemeId, string> = {
  zinc: "#09090b", slate: "#0f172a", stone: "#0c0a09", neutral: "#0a0a0a", amber: "#1c1917",
  rose: "#1e0e0e", fuchsia: "#311111", crimson: "#2d1111", scarlet: "#2f1010", ruby: "#2c0f0f",
  coral: "#2d1614", salmon: "#2b1815", peach: "#2a1a16", tangerine: "#2c1a12", apricot: "#2b1b14",
  orange: "#2d1b10", gold: "#2d2010", honey: "#2c2112", mustard: "#c78c06", lemon: "#FFF44F",
  yellow: "#FFFF00", chartreuse: "#DFFF00", lime: "#32CD32", mint: "#98FF98", jade: "#00A86B",
  emerald: "#50C878", forest: "#228B22", pine: "#01796f", sage: "#16241e", olive: "#1e2317",
  moss: "#1a2419", teal: "#102527", cyan: "#0e2628", aqua: "#0f2729", turquoise: "#102826",
  sky: "#111f2a", azure: "#0f1e2b", cerulean: "#101d2c", cobalt: "#111a2d", navy: "#0f1628",
  sapphire: "#10182a", royal: "#13162b", indigo: "#16152c", violet: "#1b152d", purple: "#1f142e",
  plum: "#23132d", lavender: "#21172c", mauve: "#24162b", orchid: "#26152d", magenta: "#2a132c",
  wine: "#281118", burgundy: "#2a1017", maroon: "#2b0f16", cherry: "#2d1115", raspberry: "#2c1219",
  strawberry: "#2d1318", watermelon: "#2e1417", blush: "#2c1719", pink: "#2b181a", bubblegum: "#2a191b",
  flamingo: "#2d171a", carnation: "#2c1618", mahogany: "#2a1512", copper: "#2b1813", bronze: "#2a1a14",
  rust: "#291915", sienna: "#281a16", umber: "#271b17", chocolate: "#261c18", coffee: "#251d19",
  espresso: "#241e1a", mocha: "#231d1b", cocoa: "#221c1a", taupe: "#241f1c", beige: "#25211d",
  tan: "#26221e", sand: "#27231f", cream: "#282420", ivory: "#292521", pearl: "#262626",
  silver: "#1e1e1e", platinum: "#1d1d1d", steel: "#1c1d1e", graphite: "#191b1d", charcoal: "#181a1c",
  ash: "#1b1b1b", smoke: "#1c1c1c", fog: "#1d1e1f", canary: "#27250e", butter: "#29230f",
  dandelion: "#26240d", sunflower: "#28230e", goldenrod: "#2b220f", saffron: "#2c2110", marigold: "#2a2210",
  banana: "#27240e",
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const BACKGROUND_THEMES: { id: BackgroundThemeId; label: string; color: string }[] = THEME_IDS.map(
  (id) => ({ id, label: capitalize(id), color: BACKGROUND_THEME_COLORS[id as BackgroundThemeId] })
);

/** Returns whether hex is light (use dark text for contrast). */
export function isLightHex(hex: string): boolean {
  const n = parseInt(hex.replace(/^#/, ""), 16);
  const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.4;
}

export function getStoredBackgroundTheme(): BackgroundThemeId {
  if (typeof window === "undefined") return "zinc";
  const raw = localStorage.getItem(BACKGROUND_THEME_KEY);
  if (raw && THEME_IDS.includes(raw as BackgroundThemeId)) return raw as BackgroundThemeId;
  return "zinc";
}

export function setStoredBackgroundTheme(id: BackgroundThemeId): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BACKGROUND_THEME_KEY, id);
}

/** All valid theme ids as a string array (for layout script allowlist). */
export const BACKGROUND_THEME_IDS_LIST: string[] = [...THEME_IDS];
