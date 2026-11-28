import Link from "next/link";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import { ArrowLink } from "@/components/design/arrow-link";
import { MetaLabel } from "@/components/design/section-label";
import { TwoToneHeading } from "@/components/design/two-tone-heading";
import { RevealLines } from "@/components/motion/reveal-lines";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { galleryCopy } from "../../copy";
import type { GalleryProfile } from "../../dto";
import { normalizeWhatsapp, whatsappLink } from "../../format";
import { galleryContainer } from "../section-heading";
import { GALLERY_NAV } from "./nav";

const copy = galleryCopy.footer;

/**
 * Ukuran wordmark: raksasa (`text-wordmark`, turunan token display) selama nama muat; nama panjang
 * memakai `text-display` di layar sempit supaya tidak meluber.
 */
function wordmarkClass(name: string): string {
  if (name.length <= 8) return "text-display sm:text-wordmark";
  if (name.length <= 16) return "text-display lg:text-wordmark";
  return "text-display";
}

const linkClass =
  "inline-flex min-h-10 w-fit items-center gap-1.5 rounded-button text-body-sm text-muted-foreground transition-colors outline-hidden hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring";

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid content-start gap-2">
      <p className="type-label text-muted-foreground">{title}</p>
      <ul className="grid">{children}</ul>
    </div>
  );
}

/**
 * Footer Galeri: ajakan kontak, kolom tautan, dan wordmark nama situs raksasa di kartu putih.
 * Fase 7: judul ajakan muncul per baris dan wordmark tersingkap naik saat di-scroll (`RevealLines`:
 * jendela pemotong lebih besar dari kotak baris, jadi huruf tidak terpotong setelah muncul; tanpa
 * JS / Mati / kurangi gerakan langsung diam di tempat).
 */
export function GalleryFooter({ profile }: { profile: GalleryProfile }) {
  const wa = normalizeWhatsapp(profile.whatsapp);
  const year = new Date().getFullYear();
  const social = [
    { href: profile.instagramUrl, label: galleryCopy.social.instagram },
    { href: profile.tiktokUrl, label: galleryCopy.social.tiktok },
  ].filter((s): s is typeof s & { href: string } => !!s.href);

  return (
    <footer className={cn(galleryContainer, "mt-24 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:mt-28 lg:mt-36")}>
      <div className="overflow-hidden rounded-card bg-card px-6 pt-10 pb-6 text-card-foreground ring-1 ring-border/70 sm:px-10 sm:pt-14 lg:px-14">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="grid content-start justify-items-start gap-6 lg:col-span-6">
            <TwoToneHeading as="h2" level="h2" first={copy.ctaFirst} second={copy.ctaSecond} reveal="scroll" />
            {wa ? (
              <ArrowLink href={whatsappLink(wa, galleryCopy.about.whatsappMessage)} external size="lg">
                {copy.ctaWhatsapp}
              </ArrowLink>
            ) : profile.contactEmail ? (
              <Button asChild size="lg" arrow>
                <a href={`mailto:${profile.contactEmail}`}>{copy.ctaEmail}</a>
              </Button>
            ) : (
              <ArrowLink href={routes.gallery.catalog} size="lg">
                {copy.ctaCatalog}
              </ArrowLink>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:col-span-6">
            <FooterColumn title={copy.explore}>
              {GALLERY_NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </FooterColumn>

            {(wa || profile.contactEmail) && (
              <FooterColumn title={copy.contact}>
                {wa && (
                  <li>
                    <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={linkClass}>
                      {galleryCopy.social.whatsapp}
                      <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </a>
                  </li>
                )}
                {profile.contactEmail && (
                  <li className="min-w-0">
                    <a href={`mailto:${profile.contactEmail}`} className={cn(linkClass, "w-auto break-all")}>
                      {profile.contactEmail}
                    </a>
                  </li>
                )}
              </FooterColumn>
            )}

            {social.length > 0 && (
              <FooterColumn title={copy.follow}>
                {social.map((s) => (
                  <li key={s.label}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                      {s.label}
                      <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </FooterColumn>
            )}
          </div>
        </div>

        {/* Wordmark hiasan: nama situs sudah dibaca di header, jadi disembunyikan dari pembaca layar. */}
        <div aria-hidden="true" className="mt-16 sm:mt-20">
          <RevealLines
            as="p"
            trigger="scroll"
            lines={[{ content: profile.siteName }]}
            className={cn("font-heading text-balance wrap-break-word", wordmarkClass(profile.siteName))}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-border pt-4">
          <MetaLabel>{copy.rights(year, profile.siteName)}</MetaLabel>
          {profile.city && <MetaLabel className="hidden sm:inline">({profile.city})</MetaLabel>}
          <a
            href="#konten"
            className="type-label inline-flex min-h-10 items-center gap-1.5 rounded-button text-muted-foreground transition-colors outline-hidden hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring"
          >
            {copy.backToTop}
            <ArrowUp className="size-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}
