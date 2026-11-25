// Penjaga perubahan belum tersimpan di menu Tampilan: klik tautan mana yang perlu dikonfirmasi.
// Fungsi murni (tanpa DOM), supaya aturannya bisa dites.

export interface LinkClick {
  /** Atribut `href` mentah (bisa relatif). */
  href: string | null;
  target: string | null;
  download: boolean;
  /** `MouseEvent.button` (0 = kiri). */
  button: number;
  /** Ctrl/Meta/Shift/Alt ditekan (buka tab/jendela baru, halaman ini tidak ditinggalkan). */
  modifier: boolean;
  defaultPrevented: boolean;
}

/**
 * Tujuan internal (path + query + hash) jika klik ini akan meninggalkan halaman lewat navigasi
 * client, sehingga perlu konfirmasi. `null` jika tidak perlu dicegat: tab baru, unduhan, tautan
 * luar (ditangani `beforeunload`), `mailto:`/`tel:`, atau hanya pindah hash di halaman yang sama.
 */
export function guardedDestination(click: LinkClick, current: URL): string | null {
  if (click.defaultPrevented || click.button !== 0 || click.modifier || click.download) return null;
  if (click.href === null || click.href.trim() === "") return null;
  if (click.target && click.target !== "_self") return null;

  let url: URL;
  try {
    url = new URL(click.href, current);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.origin !== current.origin) return null;
  if (url.pathname === current.pathname && url.search === current.search) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}
