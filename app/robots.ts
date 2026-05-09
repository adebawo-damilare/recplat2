import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://talentbridge.example.com";

  return {
    rules: [
      { userAgent: "*", allow: ["/", "/jobs", "/talent", "/about"], disallow: ["/dashboard", "/api"] },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}