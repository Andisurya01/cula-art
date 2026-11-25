import { ArrowLink } from "@/components/design/arrow-link";
import { cn } from "@/lib/utils";
import { galleryCopy } from "../copy";
import type { GalleryProfile } from "../dto";
import { InstagramIcon, TikTokIcon } from "./layout/social-icons";

/** Tautan Instagram/TikTok berlabel (pil abu + ↗, buka tab baru). Yang kosong tidak ditampilkan. */
export function SocialPills({
  profile,
  className,
}: {
  profile: Pick<GalleryProfile, "instagramUrl" | "tiktokUrl">;
  className?: string;
}) {
  const links = [
    { href: profile.instagramUrl, label: galleryCopy.social.instagram, Icon: InstagramIcon },
    { href: profile.tiktokUrl, label: galleryCopy.social.tiktok, Icon: TikTokIcon },
  ].filter((l): l is typeof l & { href: string } => !!l.href);
  if (links.length === 0) return null;

  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {links.map(({ href, label, Icon }) => (
        <li key={label}>
          <ArrowLink href={href} external variant="secondary" size="lg">
            <Icon className="size-4" />
            {label}
          </ArrowLink>
        </li>
      ))}
    </ul>
  );
}
