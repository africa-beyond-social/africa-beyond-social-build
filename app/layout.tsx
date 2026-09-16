import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { Libre_Franklin, Source_Serif_4 } from "next/font/google"
import "./globals.css"

const franklin = Libre_Franklin({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Africa & Beyond Social",
  description:
    "Africa & Beyond Social — a professional African social network for short posts, conversations, and community. From Africa, to the world.",
  generator: "v0.app",
}

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#ffffff",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`light ${franklin.variable} ${sourceSerif.variable}`}>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
