// src/app/layout.tsx
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import "react-day-picker/dist/style.css";

import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/siteUrl";
import { Analytics } from "@vercel/analytics/next";
import { ReactNode } from "react";
import Header from "@/components/Header";
import { ToastProvider } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [{ url: "/og/gradient-green-blue.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-dvh flex flex-col">
        <ToastProvider>
          <Header />
          {/* This is the critical container that provides a real height */}
          <div className="flex-1 min-h-0 flex flex-col">{children}</div>
          <Toaster />
        </ToastProvider>
        {/* Vercel Web Analytics: cookieless page views; enable it in Vercel → Project → Analytics */}
        <Analytics />
      </body>
    </html>
  );
}
