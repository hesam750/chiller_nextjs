import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { PwaClient } from "./_components/PwaClient";

const vazirmatn = Vazirmatn({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Chiller Dashboard Next",
  description: "نسخه Next.js داشبورد چیلرها",
  manifest: "/manifest.webmanifest",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
    { media: "(prefers-color-scheme: light)", color: "#0ea5e9" },
  ],
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    viewportFit: "cover",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Chiller",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body className={`antialiased ${vazirmatn.className}`}>
        {children}
        <PwaClient />
      </body>
    </html>
  );
}
