import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Reputix — Gérez votre réputation en ligne automatiquement",
    template: "%s | Reputix",
  },
  description:
    "Répondez automatiquement à vos avis Google grâce à l'IA. Améliorez votre SEO local et fidélisez vos clients. Pour restaurants, hôtels et commerces.",
  keywords: ["avis google", "réputation en ligne", "réponse automatique", "SEO local", "restaurant", "hôtel"],
  openGraph: {
    title: "Reputix — Gérez votre réputation en ligne automatiquement",
    description: "Répondez automatiquement à vos avis Google grâce à l'IA.",
    type: "website",
    locale: "fr_FR",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} h-full`}>
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
