export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: "https://dn-med-study.vercel.app/sitemap.xml",
  };
}
