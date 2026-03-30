import { MetadataRoute } from "next";
import { getSiteURL } from "@/utils/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteURL = getSiteURL();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteURL, lastModified: new Date(), changeFrequency: "daily" },
    {
      url: `${siteURL}/pricing`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteURL}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteURL}/legal/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteURL}/legal/policy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  return [...staticRoutes];
}
