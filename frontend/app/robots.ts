import { MetadataRoute } from "next";
import { getSiteURL } from "@/utils/config";

export default function robots(): MetadataRoute.Robots {
  const siteURL = getSiteURL();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/login",
          "/signup",
          "forgotpassword",
          "resetpassword",
          "verifyemail",
        ],
      },
    ],
    sitemap: `${siteURL}/sitemap.xml`,
  };
}
