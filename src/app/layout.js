import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Truyền Hình Số - Xem IPTV Trực Tuyến",
  description: "Ứng dụng xem truyền hình trực tuyến tốc độ cao và xem lịch phát sóng EPG chính xác.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Truyền Hình Số",
    startupImage: "/icons/apple-touch-icon-180x180.png",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png",  sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png" },
      { url: "/icons/apple-touch-icon-57x57.png",  sizes: "57x57" },
      { url: "/icons/apple-touch-icon-60x60.png",  sizes: "60x60" },
      { url: "/icons/apple-touch-icon-72x72.png",  sizes: "72x72" },
      { url: "/icons/apple-touch-icon-76x76.png",  sizes: "76x76" },
      { url: "/icons/apple-touch-icon-114x114.png", sizes: "114x114" },
      { url: "/icons/apple-touch-icon-120x120.png", sizes: "120x120" },
      { url: "/icons/apple-touch-icon-144x144.png", sizes: "144x144" },
      { url: "/icons/apple-touch-icon-152x152.png", sizes: "152x152" },
      { url: "/icons/apple-touch-icon-180x180.png", sizes: "180x180" },
    ],
    other: [
      { rel: "mask-icon", url: "/logo.png", color: "#00d4ff" },
    ],
  },
  other: {
    "msapplication-TileImage": "/icons/mstile-144x144.png",
    "msapplication-TileColor": "#08080a",
    "msapplication-config": "none",
  },
};

export const viewport = {
  themeColor: "#08080a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

import Header from "./components/Header";
import Footer from "./components/Footer";
import NextTopLoader from "nextjs-toploader";

export default function RootLayout({ children }) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Windows 8/10 Tile */}
        <meta name="msapplication-square70x70logo"  content="/icons/mstile-70x70.png" />
        <meta name="msapplication-square150x150logo" content="/icons/mstile-150x150.png" />
        <meta name="msapplication-square310x310logo" content="/icons/mstile-310x310.png" />
      </head>
      <body className="min-h-full flex flex-col bg-[#08080a] text-white" suppressHydrationWarning>
        <NextTopLoader
          color="#00d4ff"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #00d4ff,0 0 5px #00d4ff"
        />
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
