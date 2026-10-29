// Slug URL karya: huruf kecil, angka, tanda hubung. Fungsi murni + pencari slug unik.

export const SLUG_MAX_LENGTH = 80;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * "Patung Kepala Naga (2026)" → "patung-kepala-naga-2026". Diakritik dibuang ("é" → "e"),
 * apostrof dihapus tanpa tanda hubung ("Jum'at" → "jumat"), "&" menjadi "dan".
 */
export function slugify(text: string): string {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’‘`]/g, "")
    .replace(/&/g, " dan ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");
  return slug || "karya";
}

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(slug);
}

/**
 * Slug unik: `base`, lalu `base-2`, `base-3`, … sampai `isTaken` bernilai false.
 * `isTaken` biasanya mengecek Artwork.slug dan ArtworkSlugRedirect.oldSlug.
 */
export async function uniqueSlug(
  base: string,
  isTaken: (slug: string) => boolean | Promise<boolean>,
): Promise<string> {
  const root = isValidSlug(base) ? base : slugify(base);
  if (!(await isTaken(root))) return root;
  for (let n = 2; n < 10_000; n++) {
    const suffix = `-${n}`;
    const candidate = `${root.slice(0, SLUG_MAX_LENGTH - suffix.length).replace(/-+$/g, "")}${suffix}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error("Tidak menemukan slug unik");
}
