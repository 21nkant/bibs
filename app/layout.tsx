import type { Metadata, Viewport } from "next";
import { Archivo, DM_Sans } from "next/font/google";
import "./globals.css";

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Bibs · Pickup soccer that's actually fair", template: "%s · Bibs" },
  description: "Find pickup soccer on real NYC fields. Teams balanced by rating, spots that can't be overbooked.",
};

export const viewport: Viewport = {
  themeColor: "#0b1020",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-night font-sans text-chalk">{children}</body>
    </html>
  );
}
