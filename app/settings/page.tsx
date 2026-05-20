"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useBackgroundTheme } from "@/components/BackgroundThemeProvider";
import { BACKGROUND_THEMES, isLightHex } from "@/lib/background-theme";
import { getStoredEnabledSlugs, setStoredEnabledSlugs } from "@/lib/topic-settings";

type Category = { id: string; slug: string; name: string };

export default function SettingsPage() {
  const { backgroundTheme, setBackgroundTheme } = useBackgroundTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [enabledSlugs, setEnabledSlugs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data: Category[]) => {
        setCategories(data);
        const slugs = data.map((c) => c.slug);
        setEnabledSlugs(new Set(getStoredEnabledSlugs(slugs)));
      })
      .catch(() => setCategories([]));
  }, []);

  function toggleTopic(slug: string) {
    const allSlugs = categories.map((c) => c.slug);
    const next = new Set(enabledSlugs);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    const arr = allSlugs.filter((s) => next.has(s));
    setStoredEnabledSlugs(arr);
    setEnabledSlugs(next);
  }

  function enableAll() {
    const all = categories.map((c) => c.slug);
    setStoredEnabledSlugs(all);
    setEnabledSlugs(new Set(all));
  }

  function disableAll() {
    setStoredEnabledSlugs([]);
    setEnabledSlugs(new Set());
  }

  return (
    <main className="min-h-screen p-4 md:p-8 text-zinc-100">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <section className="mb-8 p-4 rounded-lg bg-zinc-900/80 border border-zinc-700">
          <h2 className="text-lg font-semibold mb-3">Background color</h2>
          <p className="text-zinc-400 text-sm mb-4">Choose a background color for the app.</p>
          <div className="flex flex-wrap gap-2">
            {BACKGROUND_THEMES.map(({ id, label, color }) => {
              const selected = backgroundTheme === id;
              const useDarkText = isLightHex(color);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setBackgroundTheme(id)}
                  className={`px-4 py-2 rounded-lg font-medium transition border shrink-0 ${
                    selected ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900" : ""
                  } hover:opacity-90`}
                  style={{
                    backgroundColor: color,
                    borderColor: selected ? "white" : "rgba(255,255,255,0.2)",
                    color: useDarkText ? "#1a1a1a" : "#fafafa",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mb-8 p-4 rounded-lg bg-zinc-900/80 border border-zinc-700">
          <h2 className="text-lg font-semibold mb-3">Topics</h2>
          <p className="text-zinc-400 text-sm mb-4">
            Enable or disable topics for runs. Only enabled topics can appear as floors. If none are enabled, all topics are used.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              onClick={enableAll}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border border-zinc-600 bg-zinc-800 text-zinc-200 hover:border-zinc-500"
            >
              Enable all
            </button>
            <button
              type="button"
              onClick={disableAll}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border border-zinc-600 bg-zinc-800 text-zinc-200 hover:border-zinc-500"
            >
              Disable all
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const enabled = enabledSlugs.has(cat.slug);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleTopic(cat.slug)}
                  className={`px-4 py-2 rounded-lg font-medium transition border ${
                    enabled
                      ? "bg-amber-600 border-amber-500 text-white"
                      : "bg-zinc-800/50 border-zinc-600 text-zinc-400 hover:border-zinc-500"
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
          {categories.length === 0 && (
            <p className="text-zinc-500 text-sm">Loading topics…</p>
          )}
        </section>

        <Link href="/" className="text-zinc-500 hover:underline">
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
