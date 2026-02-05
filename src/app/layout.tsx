import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import MobileContainer from "@/components/layout/MobileContainer";
import { ModeProvider } from "@/components/providers/ModeProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VERSUS - Mobile Sports Platform",
  description: "Find your rival, join a team, or recruit mercenaries.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Versus",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
        <ModeProvider>
          <ToastProvider>
            <MobileContainer>
              <Header />
              <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
                {children}
              </div>
              <BottomNav />
            </MobileContainer>
          </ToastProvider>
        </ModeProvider>
      </body>
    </html>
  );
}
