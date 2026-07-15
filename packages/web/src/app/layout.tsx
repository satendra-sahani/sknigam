import type { Metadata } from 'next';
import { Inter, Newsreader, Instrument_Sans, JetBrains_Mono, Outfit } from 'next/font/google';
import './globals.css';
import '../styles/pollistics.css';
import ClientLayout from './ClientLayout';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

// Outfit powers the public Pollistics marketing site (coral / navy / cream).
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-outfit',
  display: 'swap',
});

// Editorial fonts used by the public landing at "/"
const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
});
const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-instrument',
  display: 'swap',
});
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Pollistics — India\'s election intelligence',
  description: 'The most complete, queryable record of how India votes.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} ${newsreader.variable} ${instrumentSans.variable} ${jetbrains.variable} ${outfit.variable}`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
