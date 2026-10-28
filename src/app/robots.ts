import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api/",
        "/settings",
        "/me/",
        "/notifications",
        "/onboarding",
        "/login",
        "/signup",
        "/auth/",
        "/dashboard",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
