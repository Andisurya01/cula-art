import Image from "next/image";
import { Mail, MapPin, MessageCircle } from "lucide-react";
import { ArrowLink } from "@/components/design/arrow-link";
import { TwoToneHeading } from "@/components/design/two-tone-heading";
import { motionIndex } from "@/components/motion/motion-utils";
import { Reveal } from "@/components/motion/reveal";
import { RevealLines } from "@/components/motion/reveal-lines";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { galleryCopy } from "../copy";
import type { GalleryProfile } from "../dto";
import { normalizeWhatsapp, paragraphs, whatsappLink } from "../format";
import { numberSections } from "./home/home-data";
import { SocialPills } from "./profile-links";
import { RevealSectionLabel, galleryContainer } from "./section-heading";

const copy = galleryCopy.about;

/** Kepala bagian halaman Tentang: label bernomor + judul h2; label, judul, lalu isi muncul saat di-scroll. */
function AboutSection({
  id,
  index,
  eyebrow,
  title,
  children,
}: {
  id: string;
  index?: number;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="grid gap-6">
      <RevealSectionLabel index={index} className="border-t border-border pt-4">
        {eyebrow}
      </RevealSectionLabel>
      <RevealLines as="h2" id={id} trigger="scroll" lines={[{ content: title }]} className="font-heading text-h3" />
      <Reveal className="grid gap-6">{children}</Reveal>
    </section>
  );
}

/**
 * Halaman Tentang: foto, bio, perjalanan (aboutText), kota, kontak, sosial. Field kosong tidak ditampilkan.
 * Fase 7: judul muncul per baris saat halaman tampil, foto tersingkap (CSS murni, tanpa menunda
 * pemuatan), bio menyusul; bagian bernomor muncul saat di-scroll.
 */
export function AboutView({ profile }: { profile: GalleryProfile }) {
  const journey = paragraphs(profile.aboutText);
  const wa = normalizeWhatsapp(profile.whatsapp);
  const hasContact = Boolean(wa || profile.contactEmail);
  const hasSocial = Boolean(profile.instagramUrl || profile.tiktokUrl);
  const isEmpty = !profile.bio && journey.length === 0 && !hasContact && !hasSocial;
  const index = numberSections({ journey: journey.length > 0, contact: hasContact, social: hasSocial });

  return (
    <div className={cn(galleryContainer, "pt-8 sm:pt-12 lg:pt-16")}>
      <header className="grid gap-6 lg:gap-8">
        <MetaRow city={profile.city} />
        <TwoToneHeading
          as="h1"
          level="display"
          first={profile.siteName}
          second={profile.city ? copy.titleSecondCity(profile.city) : copy.titleSecond}
          reveal="load"
          revealDelay={1}
          className="max-w-5xl wrap-break-word"
        />
      </header>

      <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-12 lg:gap-16">
        {profile.avatarSrc && (
          <div className="lg:col-span-5">
            <div className="relative aspect-[4/5] w-full max-w-sm overflow-hidden rounded-image bg-muted motion-enter-clip lg:sticky lg:top-28 lg:max-w-none">
              <Image
                src={profile.avatarSrc}
                alt={profile.siteName}
                fill
                sizes="(min-width: 1280px) 480px, (min-width: 1024px) 38vw, 384px"
                preload
                className="object-cover motion-enter-zoom"
              />
            </div>
          </div>
        )}

        <div className={cn("grid content-start gap-14", profile.avatarSrc ? "lg:col-span-7" : "max-w-3xl lg:col-span-12")}>
          {(profile.bio || isEmpty) && (
            <div className="grid gap-5 motion-enter" style={motionIndex(3)}>
              {profile.bio && <p className="max-w-prose font-heading text-h4 whitespace-pre-line text-pretty">{profile.bio}</p>}
              {isEmpty && <p className="max-w-prose text-body-lg text-muted-foreground">{copy.empty}</p>}
            </div>
          )}

          {journey.length > 0 && (
            <AboutSection id="perjalanan" index={index.journey} eyebrow={copy.journeyEyebrow} title={copy.journeyTitle}>
              <div className="grid max-w-prose gap-5 text-body-lg text-pretty">
                {journey.map((paragraph, i) => (
                  <p key={i} className="whitespace-pre-line">
                    {paragraph}
                  </p>
                ))}
              </div>
            </AboutSection>
          )}

          {hasContact && (
            <AboutSection id="kontak" index={index.contact} eyebrow={copy.contactEyebrow} title={copy.contactTitle}>
              <p className="text-muted-foreground">{copy.contactIntro}</p>
              <div className="flex flex-wrap items-center gap-2">
                {wa && (
                  <ArrowLink href={whatsappLink(wa, copy.whatsappMessage)} external size="lg">
                    <MessageCircle className="size-4" aria-hidden="true" />
                    {copy.whatsappButton}
                  </ArrowLink>
                )}
                {profile.contactEmail && (
                  <a
                    href={`mailto:${profile.contactEmail}`}
                    className={cn(
                      buttonVariants({ variant: "secondary", size: "lg" }),
                      "h-auto min-h-11 max-w-full py-2.5 break-all whitespace-normal",
                    )}
                  >
                    <Mail className="size-4" aria-hidden="true" />
                    {profile.contactEmail}
                  </a>
                )}
              </div>
            </AboutSection>
          )}

          {hasSocial && (
            <AboutSection id="ikuti" index={index.social} eyebrow={copy.socialEyebrow} title={copy.socialTitle}>
              <SocialPills profile={profile} />
            </AboutSection>
          )}

          <Reveal effect="fade" className="w-fit">
            <ArrowLink href={routes.gallery.catalog} size="lg">
              {copy.viewWorks}
            </ArrowLink>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

/** Baris label meta atas: "TENTANG" dan kota (jika ada). */
function MetaRow({ city }: { city: string | null }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-border pt-4 motion-enter-fade">
      <span className="type-label inline-flex items-center gap-2 text-muted-foreground">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-foreground" />
        {copy.eyebrow}
      </span>
      {city && (
        <span className="type-label inline-flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="size-3.5" aria-hidden="true" />
          {city}
        </span>
      )}
    </div>
  );
}
