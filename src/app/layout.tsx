import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pattaya Nice City — Coming Soon",
  description: "Pattaya Nice City is coming soon. Stay tuned!",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
