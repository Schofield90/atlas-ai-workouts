import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AIAssistant from "./components/AIAssistant";
import { ErrorBoundary } from "./components/error-boundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Workout Generator",
  description: "AI-powered personalized workout generation platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-900 text-gray-100`}
      >
        <ErrorBoundary>
          {children}
          <AIAssistant />
        </ErrorBoundary>
      </body>
    </html>
  );
}
