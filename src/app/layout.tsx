import type { Metadata } from "next";
import { Inter, Orbitron } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { PageViewTracker } from "@/components/layout/page-view-tracker";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import { getLocale } from "next-intl/server";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-orbitron",
  weight: ["400", "700", "900"],
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pattayanicecity.com";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Pattaya Nice City - Restaurants, Beaches, Activities & Family Guide",
    template: "%s | Pattaya Nice City",
  },
  description:
    "The #1 community guide to Pattaya. Restaurants, beaches, temples, activities, coworking & family-friendly spots. Real ratings by real people.",
  keywords: [
    "pattaya guide", "pattaya restaurants", "pattaya beaches", "pattaya activities",
    "pattaya family", "things to do pattaya", "pattaya thailand", "pattaya temples",
    "pattaya coworking", "pattaya digital nomad", "pattaya kids", "pattaya food",
    "pattaya markets", "pattaya wellness", "pattaya sports", "pattaya accommodation",
  ],
  authors: [{ name: "Pattaya Nice City" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "Pattaya Nice City",
    title: "Pattaya Nice City - Restaurants, Beaches, Activities & Family Guide",
    description: "The #1 community guide to Pattaya. Real ratings, real reviews, by real people.",
    images: [{ url: `${baseUrl}/api/og`, width: 1200, height: 630, alt: "Pattaya Nice City - Your Complete Pattaya Guide" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pattaya Nice City - Restaurants, Beaches, Activities & Family Guide",
    description: "The #1 community guide to Pattaya. Real ratings, honest reviews, best spots.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
  alternates: {
    canonical: baseUrl,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#1a1510",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning className={`${inter.variable} ${orbitron.variable}`}>
      <head>
        <link rel="icon" href="/icons/headonly/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/headonly/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/headonly/favicon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/headonly/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          {children}
          <Toaster />
          <PageViewTracker />
          <NavigationProgress />
        </ThemeProvider>
      </body>
    </html>
  );
}
