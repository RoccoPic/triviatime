/**
 * Monster titles by category slug. One title is chosen per encounter (deterministic by run+floor+encounter).
 * All keys are category slugs (hyphenated lowercase). Each entry has exactly 5 titles.
 */
export const MONSTER_LIST: Record<string, string[]> = {
  // — History —
  "history":               ["Historian Ghost", "Time Traveler", "Archive Owl", "Chronicle Crocodile", "Relic Raven"],
  "ancient-egypt":         ["Pharaoh Falcon", "Pyramid Python", "Sphinx Scorpion", "Nile Narwhal", "Mummy Mongoose"],
  "ancient-rome":          ["Roman Rhino", "Gladiator Gorilla", "Centurion Cheetah", "Colosseum Cobra", "Caesar's Chinchilla"],
  "world-war-1":           ["Wartime Walrus", "Trench Tiger", "Battalion Bear", "Dreadnought Dragon", "Cavalry Cougar"],
  "world-war-2":           ["Blitz Badger", "Pacific Panther", "Allied Armadillo", "Victory Vulture", "Liberation Lion"],
  "cold-war":              ["Cold Crocodile", "Spy Sparrow", "Iron Ibex", "Curtain Coyote", "Détente Dolphin"],
  "industrial-revolution": ["Factory Fox", "Steam Seal", "Industrial Iguana", "Revolution Raven", "Machinist Mole"],

  // — Art —
  "art":            ["Art Critic Axolotl", "Renaissance Rhino", "Graffiti Gecko", "Palette Panda", "Canvas Crane"],
  "impressionism":  ["Impressionist Impala", "Brushstroke Buffalo", "Palette Panda", "Canvas Caterpillar", "Monet Mantis"],
  "famous-art":     ["Masterpiece Moose", "Sculpture Salamander", "Gallery Gazelle", "Portrait Porcupine", "Fresco Frog"],
  "art-movements":  ["Cubist Caracal", "Surreal Seahorse", "Abstract Alpaca", "Baroque Beetle", "Modern Meerkat"],
  "photography":    ["Pixel Penguin", "Shutter Shark", "Focus Ferret", "Lens Lemur", "Aperture Antelope"],
  "graphic-design": ["Designer Deer", "Vector Viper", "Gradient Giraffe", "Layout Lynx", "Typography Toucan"],
  "architecture":   ["Architect Albatross", "Blueprint Bison", "Structure Sloth", "Foundation Flamingo", "Pillar Pelican"],
  "cinematography": ["Camera Camel", "Director Duck", "Screenplay Skunk", "Footage Fox", "Cinematic Chipmunk"],

  // — Math —
  "math":         ["Number Ninja", "Sum Serpent", "Fraction Fox", "Digit Dingo", "Integer Ibis"],
  "algebra":      ["Algebraic Anaconda", "Variable Vole", "Equation Eagle", "Exponent Eel", "Formula Finch"],
  "geometry":     ["Geometric Gopher", "Triangle Tapir", "Circle Chimpanzee", "Angle Ant", "Polygon Parrot"],
  "trigonometry": ["Sine Snail", "Cosine Condor", "Tangent Termite", "Theta Thrush", "Trigonometric Toad"],
  "calculus":     ["Derivative Dingo", "Integral Ibis", "Limit Llama", "Calculus Cat", "Function Falcon"],
  "statistics":   ["Statistical Stingray", "Mean Mongoose", "Median Moose", "Mode Macaw", "Probability Peacock"],
  "math-puzzles": ["Puzzle Platypus", "Logic Leopard", "Riddle Raccoon", "Pattern Puffin", "Mystery Marmot"],

  // — Science —
  "science":        ["Mad Scientist Moose", "Lab Lemur", "Hypothesis Heron", "Experiment Elk", "Theory Thrush"],
  "biology":        ["Biological Baboon", "Cell Cheetah", "DNA Dragonfly", "Organism Otter", "Mitosis Mouse"],
  "chemistry":      ["Chemical Chameleon", "Molecule Mantis", "Element Elephant Seal", "Atomic Axolotl", "Periodic Puma"],
  "earth-science":  ["Erosion Elephant", "Tectonic Tiger", "Geology Gull", "Earthquake Elk", "Mineral Mink"],
  "genetics":       ["Gene Giraffe", "Chromosome Crow", "Heredity Hamster", "Mutation Magpie", "Allele Alligator"],
  "human-anatomy":  ["Anatomical Aardvark", "Skeletal Squid", "Muscular Manta Ray", "Organ Orangutan", "Cardiac Canary"],
  "astronomy":      ["Astro Alligator", "Cosmic Cobra", "Nebula Newt", "Stellar Starfish", "Galactic Gecko"],
  "meteorology":    ["Weather Weasel", "Storm Stoat", "Cloud Cougar", "Thunder Turtle", "Lightning Lemming"],
  "botany":         ["Botanical Beaver", "Leaf Lizard", "Petal Possum", "Root Rooster", "Photosynthesis Pika"],
  "forensics":      ["Forensic Ferret", "Detective Dove", "Evidence Emu", "Crime Scene Crane", "Investigation Iguana"],

  // — Geography —
  "geography":       ["Globe Trotter Gnu", "Compass Crab", "Map Moth", "Meridian Marmot", "Latitude Lynx"],
  "countries":       ["National Narwhal", "Global Gorilla", "Border Bison", "Sovereign Seal", "Territory Toucan"],
  "world-capitals":  ["Capital Caiman", "Metropolis Mole", "City Salamander", "Urban Urchin", "Downtown Dodo"],
  "us-states":       ["State Starling", "Patriotic Panda", "Border Badger", "Regional Robin", "Provincial Porcupine"],
  "national-parks":  ["Wilderness Wolf", "Trail Tasmanian Devil", "Ranger Reindeer", "Summit Swan", "Canyon Cougar"],
  "oceans-seas":     ["Ocean Octopus", "Tidal Tern", "Marine Manatee", "Wave Walrus", "Current Cuttlefish"],
  "islands":         ["Island Iguana", "Archipelago Albatross", "Lagoon Lynx", "Tropical Tortoise", "Reef Rattlesnake"],

  // — Miscellaneous —
  "technology":  ["Tech Tarantula", "Digital Dolphin", "Cyber Cheetah", "Binary Bat", "Algorithm Armadillo"],
  "food":        ["Culinary Capybara", "Gourmet Gibbon", "Recipe Raven", "Flavor Flamingo", "Chef Chipmunk"],
  "sports":      ["Scoreboard Stag", "Trophy Tiger", "Referee Raven", "Overtime Otter", "Penalty Parrot"],
  "video-games": ["Pixel Piranha", "Respawn Raptor", "Boss Bat", "Dungeon Dingo", "Speedrun Salamander"],
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

/** Pick a deterministic monster title for this encounter. Same runId + floorIndex + encounterIndex => same title. */
export function getMonsterTitle(slug: string, runId: string, floorIndex: number, encounterIndex: number): string {
  const list = MONSTER_LIST[slug];
  if (!list || list.length === 0) return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const seed = hashString(runId) + floorIndex * 31 + encounterIndex * 7;
  const idx = Math.abs(seed) % list.length;
  return list[idx];
}
