import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { BACKGROUND_THEME_IDS_LIST } from "@/lib/background-theme";

export const metadata: Metadata = {
  title: "Trivia Roguelike",
  description: "A roguelike trivia game with floors, monsters, and progress tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var k='trivia-bg';var v=localStorage.getItem(k);var ok=${JSON.stringify(BACKGROUND_THEME_IDS_LIST)};if(v&&ok.indexOf(v)!==-1)document.body.setAttribute('data-bg',v);})();`,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
