const KEY = "trivia-show-correct-explanation";

/**
 * Whether to show the citation explanation after *correct* answers.
 * Defaults to false — explanations on wrong answers are always shown.
 */
export function getShowCorrectExplanation(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "true";
}

export function setShowCorrectExplanation(value: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, value ? "true" : "false");
}
