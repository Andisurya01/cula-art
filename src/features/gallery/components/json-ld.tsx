import { serializeJsonLd } from "../seo";

/** Data terstruktur schema.org. `<` di-escape oleh serializeJsonLd (lihat docs Next "JSON-LD"). */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
