import Image from "next/image";
import { Mail, MapPin, MessageCircle } from "lucide-react";
import { routes } from "@/lib/routes";
import { galleryCopy } from "../copy";
import type { GalleryProfile } from "../dto";
import { normalizeWhatsapp, paragraphs, whatsappLink } from "../format";
import { SocialPills } from "./profile-links";
import { ArrowLink, Eyebrow, pillLinkClass } from "./section-heading";

const copy = galleryCopy.about;

/** Halaman Tentang: foto, bio, perjalanan (aboutText), kota, kontak, sosial. Field kosong tidak ditampilkan. */
export function AboutView({ profile }: { profile: GalleryProfile }) {
  const journey = paragraphs(profile.aboutText);
  const wa = normalizeWhatsapp(profile.whatsapp);
  const hasContact = Boolean(wa || profile.contactEmail);
  const hasSocial = Boolean(profile.instagramUrl || profile.tiktokUrl);
  const isEmpty = !profile.bio && journey.length === 0 && !hasContact && !hasSocial;

  return (
    <div className="mx-auto grid max-w-7xl gap-12 px-4 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-12 lg:gap-16 lg:px-10 lg:pt-16">
      {profile.avatarSrc && (
        <div className="lg:col-span-5">
          <div className="relative aspect-[4/5] w-full max-w-sm overflow-hidden rounded-sm bg-muted lg:sticky lg:top-24 lg:max-w-none">
            <Image
              src={profile.avatarSrc}
              alt={profile.siteName}
              fill
              sizes="(min-width: 1280px) 480px, (min-width: 1024px) 38vw, 384px"
              preload
              className="object-cover"
            />
          </div>
        </div>
      )}

      <div className={profile.avatarSrc ? "grid content-start gap-12 lg:col-span-7" : "grid max-w-3xl content-start gap-12 lg:col-span-12"}>
        <header className="grid gap-5">
          <Eyebrow>{copy.eyebrow}</Eyebrow>
          <h1 className="font-display text-5xl leading-[1.02] tracking-tight text-balance sm:text-6xl">
            {profile.siteName}
          </h1>
          {profile.city && (
            <p className="inline-flex items-center gap-2 text-muted-foreground">
              <MapPin className="size-4" aria-hidden="true" />
              {profile.city}
            </p>
          )}
          {profile.bio && <p className="max-w-prose text-xl leading-relaxed whitespace-pre-line text-pretty">{profile.bio}</p>}
          {isEmpty && <p className="max-w-prose text-muted-foreground">{copy.empty}</p>}
        </header>

        {journey.length > 0 && (
          <section aria-labelledby="perjalanan" className="grid gap-5">
            <h2 id="perjalanan" className="font-display text-3xl tracking-tight sm:text-4xl">
              {copy.journeyTitle}
            </h2>
            <div className="grid max-w-prose gap-5 text-lg leading-relaxed text-pretty">
              {journey.map((paragraph, i) => (
                <p key={i} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        )}

        {hasContact && (
          <section aria-labelledby="kontak" className="grid gap-4">
            <h2 id="kontak" className="font-display text-3xl tracking-tight sm:text-4xl">
              {copy.contactTitle}
            </h2>
            <p className="text-muted-foreground">{copy.contactIntro}</p>
            <div className="flex flex-wrap items-center gap-3">
              {wa && (
                <a
                  href={whatsappLink(wa, copy.whatsappMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={pillLinkClass("primary")}
                >
                  <MessageCircle className="size-4" aria-hidden="true" />
                  {copy.whatsappButton}
                </a>
              )}
              {profile.contactEmail && (
                <a href={`mailto:${profile.contactEmail}`} className={pillLinkClass("secondary", "h-auto min-h-12 py-3 break-all")}>
                  <Mail className="size-4 shrink-0" aria-hidden="true" />
                  {profile.contactEmail}
                </a>
              )}
            </div>
          </section>
        )}

        {hasSocial && (
          <section aria-labelledby="ikuti" className="grid gap-4">
            <h2 id="ikuti" className="font-display text-3xl tracking-tight sm:text-4xl">
              {copy.socialTitle}
            </h2>
            <SocialPills profile={profile} />
          </section>
        )}

        <ArrowLink href={routes.gallery.catalog} className="w-fit">
          {copy.viewWorks}
        </ArrowLink>
      </div>
    </div>
  );
}
