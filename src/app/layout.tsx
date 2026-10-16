import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
import { getSeasons } from "@/lib/f1/service";
import "./globals.css";

const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });
const display = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });

export const metadata: Metadata = {
  title: { default: "F1 Analyst", template: "%s · F1 Analyst" },
  description: "A Formula 1 analysis workspace for the season, races, drivers, constructors, and historical standings published by Jolpica-F1.",
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let seasons: number[] = [];
  try {
    seasons = (await getSeasons()).seasons;
  } catch {
    seasons = [];
  }
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${display.variable}`} suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var d=localStorage.getItem("f1-density");if(d==="compact")document.documentElement.dataset.density="compact";var m=localStorage.getItem("f1-motion");if(m==="reduce")document.documentElement.dataset.motion="reduce";var s=localStorage.getItem("f1-sidebar");if(s==="collapsed")document.documentElement.dataset.sidebar="collapsed";}catch(e){}',
          }}
        />
        <AppShell seasons={seasons}>{children}</AppShell>
      </body>
    </html>
  );
}
