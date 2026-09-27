import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lytera - Platform Rujukan Pasien Digital & Rekam Medis Bersama",
  description:
    "Infrastruktur digital rujukan pasien berjenjang dan rekam medis terpadu untuk fasilitas kesehatan Indonesia.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${plusJakartaSans.variable} font-sans min-h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F7F8FA] text-slate font-sans w-full max-w-full overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}

