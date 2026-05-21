import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive", color: "var(--text-page)" }}
    >
      <Image src="/logo.png" alt="Trivia Roguelike logo" width={96} height={96} className="mb-4" style={{ imageRendering: "pixelated" }} />
      <h1 className="text-4xl font-bold mb-2">Trivia Roguelike</h1>
      <p className="mb-8" style={{ color: "var(--text-muted)" }}>Defeat trivia monsters. Earn run money. Survive the floors.</p>
      {session ? (
        <div className="flex gap-4 flex-wrap justify-center">
          <Link
            href="/run"
            className="px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 font-medium transition"
            style={{ color: "#fff" }}
          >
            Start run
          </Link>
          <Link
            href="/shop"
            className="px-6 py-3 rounded-lg font-medium transition"
            style={{ border: "1px solid var(--text-muted)", color: "var(--text-page)" }}
          >
            Shop
          </Link>
          <Link
            href="/progress"
            className="px-6 py-3 rounded-lg font-medium transition"
            style={{ border: "1px solid var(--text-muted)", color: "var(--text-page)" }}
          >
            My progress
          </Link>
          <Link
            href="/settings"
            className="px-6 py-3 rounded-lg font-medium transition"
            style={{ border: "1px solid var(--text-muted)", color: "var(--text-page)" }}
          >
            Settings
          </Link>
          <Link
            href="/api/auth/signout"
            className="px-6 py-3 rounded-lg text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            Sign out
          </Link>
        </div>
      ) : (
        <div className="flex gap-4 flex-wrap justify-center">
          <Link
            href="/auth/signin"
            className="px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 font-medium transition"
            style={{ color: "#fff" }}
          >
            Sign in
          </Link>
          <Link
            href="/auth/register"
            className="px-6 py-3 rounded-lg font-medium transition"
            style={{ border: "1px solid var(--text-muted)", color: "var(--text-page)" }}
          >
            Sign up
          </Link>
          <Link
            href="/settings"
            className="px-6 py-3 rounded-lg font-medium transition"
            style={{ border: "1px solid var(--text-muted)", color: "var(--text-page)" }}
          >
            Settings
          </Link>
        </div>
      )}
    </main>
  );
}
