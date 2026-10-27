import type { Metadata } from "next";
import { Barlow_Condensed, DM_Sans, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Balls } from "@/components/Balls";
import { Providers } from "@/components/Providers";
import { Connect } from "@/components/Connect";

const display = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-display" });
const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Veto",
  description: "A pick logger that refuses the cells where you lose to the close.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable} ${mono.variable}`}>
        <Providers>
          <Balls />
          <div className="shell">
            <nav className="nav">
              <Link className="wordmark" href="/">Veto</Link>
              <div className="nav-links">
                <Link href="/board">Board</Link>
                <Link href="/record">Record</Link>
                <Link href="/letter">Letter</Link>
                <Connect />
              </div>
            </nav>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}

