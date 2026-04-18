import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { OrganizationJsonLd } from "@/components/organization-jsonld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-context";
import { THEME_STORAGE_KEY } from "@/lib/theme-storage";
import "./globals.css";

const defaultSite = "http://localhost:3000";

function metadataBase(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || defaultSite;
  try {
    return new URL(raw.endsWith("/") ? raw.slice(0, -1) : raw);
  } catch {
    return new URL(defaultSite);
  }
}

export const metadata: Metadata = {
  metadataBase: metadataBase(),
  title: {
    default: "Tradebook",
    template: "%s · Tradebook",
  },
  description: "Trades discovery and job coordination (Ireland)",
  openGraph: {
    type: "website",
    siteName: "Tradebook",
    locale: "en_IE",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tradebook",
    description: "Trades discovery and job coordination (Ireland)",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366F1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeBoot = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);var dark;if(t==="dark")dark=true;else if(t==="light")dark=false;else dark=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",dark);}catch(e){}})();`;

  return (
    <html lang="en-IE" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col antialiased">
        <Script id="theme-boot" strategy="beforeInteractive">
          {themeBoot}
        </Script>
        <ThemeProvider>
          <OrganizationJsonLd />
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
          <CookieConsentBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
