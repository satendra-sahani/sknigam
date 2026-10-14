import type { Metadata } from 'next';
import { Inter, Newsreader, Instrument_Sans, JetBrains_Mono, Outfit, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import '../styles/pollistics.css';
import '../styles/pollstics-news.css';
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
const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-noto-deva',
  display: 'swap',
});

const SITE_TITLE = 'Pollstics — स्वतंत्र हिंदी डिजिटल न्यूज़';
const SITE_DESC = 'राजनीति, समाज, दुनिया और संस्कृति की खबरें तथ्यों और ज़िम्मेदारी के साथ।';
const LOGO = '/assets/pollstics/logo.png';

export const metadata: Metadata = {
  metadataBase: new URL('https://pollstics.com'),
  title: SITE_TITLE,
  description: SITE_DESC,
  icons: {
    icon: LOGO,
    apple: LOGO,
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESC,
    url: 'https://pollstics.com',
    siteName: 'Pollstics',
    locale: 'hi_IN',
    type: 'website',
    images: [{ url: LOGO, width: 640, height: 640, alt: 'Pollstics' }],
  },
  twitter: {
    card: 'summary',
    title: SITE_TITLE,
    description: SITE_DESC,
    images: [LOGO],
  },
  robots: {
    index: true,
    follow: true,
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
        className={`${inter.className} ${newsreader.variable} ${instrumentSans.variable} ${jetbrains.variable} ${outfit.variable} ${notoDevanagari.variable}`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
