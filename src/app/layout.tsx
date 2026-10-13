// src/app/layout.tsx
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import "react-day-picker/dist/style.css";

import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { ReactNode } from "react";
import Header from "@/components/Header";
import { ToastProvider } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Solarpunk Taskforce",
  description: "Coordination platform for humanitarian and environmental projects",
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
