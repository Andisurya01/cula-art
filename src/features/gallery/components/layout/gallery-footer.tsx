import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import { galleryCopy } from "../../copy";
import type { GalleryProfile } from "../../dto";
import { normalizeWhatsapp } from "../../format";
import { GALLERY_NAV } from "./nav";
import { SocialLinks } from "./social-links";

export function GalleryFooter({ profile }: { profile: GalleryProfile }) {
  const wa = normalizeWhatsapp(profile.whatsapp);
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-border/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[2fr_1fr_1fr] lg:px-10">
        <div className="grid content-start gap-3">
          <p className="font-display text-2xl tracking-tight">{profile.siteName}</p>
          {profile.tagline && <p className="max-w-sm text-sm text-muted-foreground">{profile.tagline}</p>}
          <SocialLinks social={profile} className="-ml-2.5" />
        </div>

        <nav aria-label="Menu bawah" className="grid content-start gap-2 text-sm">
          {GALLERY_NAV.map((item) => (
            <Link key={item.href} href={item.href} className="w-fit text-muted-foreground hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>

        {(wa || profile.contactEmail) && (
          <div className="grid content-start gap-2 text-sm">
            <p className="font-medium">{galleryCopy.footer.contact}</p>
            {wa && (
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <MessageCircle className="size-4" />
                {galleryCopy.social.whatsapp}
              </a>
            )}
            {profile.contactEmail && (
              <a
                href={`mailto:${profile.contactEmail}`}
                className="inline-flex w-fit items-center gap-2 break-all text-muted-foreground hover:text-foreground"
              >
                <Mail className="size-4 shrink-0" />
                {profile.contactEmail}
              </a>
            )}
          </div>
        )}
      </div>
      <div className="mx-auto max-w-7xl px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] text-xs text-muted-foreground sm:px-6 lg:px-10">
        {galleryCopy.footer.rights(year, profile.siteName)}
      </div>
    </footer>
  );
}
