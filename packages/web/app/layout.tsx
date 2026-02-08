import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agents of Truth',
  description: 'Policy-governed autonomous agents with zero-knowledge proofs',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

