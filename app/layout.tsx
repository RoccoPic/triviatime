import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { BACKGROUND_THEME_IDS_LIST } from "@/lib/background-theme";
import { Cormorant_Garamond, DM_Sans, JetBrains_Mono } from "next/font/google";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trivia Time",
  description: "A roguelike trivia game with floors, monsters, and progress tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable} ${jetbrains.variable}`}>
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
