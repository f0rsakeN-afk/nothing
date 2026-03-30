export function getSiteURL(): string {
  const siteURL = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteURL) {
    console.warn("NEXT_PUBLIC_SITE_URL not set!");
  }
  return siteURL || "snippio.xyz";
}
