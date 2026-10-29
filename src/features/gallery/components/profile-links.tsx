import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { galleryCopy } from "../copy";
import type { GalleryProfile } from "../dto";
import { InstagramIcon, TikTokIcon } from "./layout/social-icons";

/** Tautan Instagram/TikTok berlabel (bukan hanya ikon). Yang kosong tidak ditampilkan. */
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
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Icon className="size-4" />
            {label}
            <ArrowUpRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  );
}
