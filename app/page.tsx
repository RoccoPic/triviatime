import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-zinc-100">
      <h1 className="text-4xl font-bold mb-2">Trivia Roguelike</h1>
      <p className="text-zinc-400 mb-8">Defeat trivia monsters. Earn run money. Survive the floors.</p>
      {session ? (
        <div className="flex gap-4">
          <Link
            href="/run"
            className="px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 font-medium transition"
          >
            Start run
          </Link>
          <Link
            href="/progress"
            className="px-6 py-3 rounded-lg border border-zinc-600 hover:border-zinc-500 font-medium transition"
          >
            My progress
          </Link>
          <Link
            href="/settings"
            className="px-6 py-3 rounded-lg border border-zinc-600 hover:border-zinc-500 font-medium transition"
          >
            Settings
          </Link>
          <Link
            href="/api/auth/signout"
            className="px-6 py-3 rounded-lg text-zinc-400 hover:text-zinc-300 text-sm"
          >
            Sign out
          </Link>
        </div>
      ) : (
        <div className="flex gap-4">
          <Link
            href="/auth/signin"
            className="px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 font-medium transition"
          >
            Sign in
          </Link>
          <Link
            href="/auth/register"
            className="px-6 py-3 rounded-lg border border-zinc-600 hover:border-zinc-500 font-medium transition"
          >
            Sign up
          </Link>
          <Link
            href="/settings"
            className="px-6 py-3 rounded-lg border border-zinc-600 hover:border-zinc-500 font-medium transition"
          >
            Settings
          </Link>
        </div>
      )}
    </main>
  );
}
