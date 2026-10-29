import { galleryCopy } from "../../copy";
import type { GalleryProfile } from "../../dto";
import { GalleryFooter } from "./gallery-footer";
import { GalleryHeader } from "./gallery-header";
import { galleryDisplayFont } from "./fonts";

/** Kerangka Galeri: header, isi, footer. Dipakai layout (galeri) dan 404 global. */
export function GalleryShell({ profile, children }: { profile: GalleryProfile; children: React.ReactNode }) {
  return (
    <div className={`${galleryDisplayFont.variable} flex min-h-svh flex-col`}>
      <a
        href="#konten"
        className="sr-only z-50 rounded-full bg-foreground px-4 py-2 text-sm text-background focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {galleryCopy.nav.skipToContent}
      </a>
      <GalleryHeader profile={profile} />
      <main id="konten" className="flex-1">
        {children}
      </main>
      <GalleryFooter profile={profile} />
    </div>
  );
}
