import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Payments Agent | zkENS",
  description: "Autonomous payments agent with ENS policy enforcement and zk proofs",
  keywords: ["payments", "agent", "ENS", "zk proofs", "USDC", "autonomous"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-gray-950`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
