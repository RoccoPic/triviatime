const TOPIC_SETTINGS_KEY = "trivia-topics-enabled";

/** Returns enabled category slugs. If nothing stored, returns allSlugs (all enabled). */
export function getStoredEnabledSlugs(allSlugs: string[]): string[] {
  if (typeof window === "undefined") return allSlugs;
  const raw = localStorage.getItem(TOPIC_SETTINGS_KEY);
  if (raw === null) return allSlugs;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return allSlugs;
    return parsed.filter((s): s is string => typeof s === "string");
  } catch {
    return allSlugs;
  }
}

export function setStoredEnabledSlugs(slugs: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOPIC_SETTINGS_KEY, JSON.stringify(slugs));
}
