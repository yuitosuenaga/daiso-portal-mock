import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { Noto_Sans, Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  display: "swap",
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "海外運用ポータル",
  description: "海外運用ポータル",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body
        className={`${notoSans.variable} ${notoSansJP.variable} font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
