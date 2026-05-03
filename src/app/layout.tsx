import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { PwaClient } from "./_components/PwaClient";
import { cookies } from "next/headers";
import { I18nProvider } from "./_components/i18n";
import { LanguageSwitcher } from "./_components/LanguageSwitcher";


const byekan = localFont({
  src: "/app/fonts/BYekan.ttf", 
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const store = await cookies();
  const langCookie = store.get("lang")?.value;
  const initialLocale = langCookie === "ar" || langCookie === "en" ? (langCookie as "ar" | "en") : "fa";
  const dir = initialLocale === "en" ? "ltr" : "rtl";
  return (
    <html lang={initialLocale} dir={dir}>
      <body className={`antialiased ${byekan.className}`}>
        <I18nProvider initialLocale={initialLocale}>
          <LanguageSwitcher />
          {children}
        </I18nProvider>
        <PwaClient />
      </body>
    </html>
  );
}