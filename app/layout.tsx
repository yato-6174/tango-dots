import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? "tangodots.example.com";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const metadataBase = new URL(`${protocol}://${host}`);

  return {
    metadataBase,
    title: "TangoDots | 毎日続く英単語帳",
    description: "1日100語から、復習を優先して続ける英単語帳。",
    openGraph: {
      title: "TangoDots | 毎日続く英単語帳",
      description: "1日100語から、復習を優先して続ける英単語帳。",
      images: ["/og.png"],
    },
    twitter: { card: "summary_large_image" },
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
