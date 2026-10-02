import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import FloatingLumen from "@/components/layout/floating-lumen";
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
  title: "Lumen | Private Clinical Intelligence",
  description: "Local healthcare AI intelligence. Private by design for hospital environments.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try {
              if (localStorage.getItem("lumen-theme") === "dark") {
                document.documentElement.classList.add("dark");
              }
            } catch {}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#F8FAF9] text-[#172033] dark:bg-[#0B1110] dark:text-[#EEF2EF]">
        {children}
        <FloatingLumen />
      </body>
    </html>
  );
}
