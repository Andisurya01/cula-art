import type { MetadataRoute } from "next";
import { routes } from "@/lib/routes";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: [routes.studio.home, routes.login] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
