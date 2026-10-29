import { cn } from "@/lib/utils";
import { galleryCopy } from "../../copy";
import { InstagramIcon, TikTokIcon } from "./social-icons";

export type SocialLinkData = { instagramUrl: string | null; tiktokUrl: string | null };

/** Ikon Instagram/TikTok (yang kosong tidak ditampilkan). */
export function SocialLinks({ social, className }: { social: SocialLinkData; className?: string }) {
  const links = [
    { href: social.instagramUrl, label: galleryCopy.social.instagram, Icon: InstagramIcon },
    { href: social.tiktokUrl, label: galleryCopy.social.tiktok, Icon: TikTokIcon },
  ].filter((l): l is typeof l & { href: string } => !!l.href);
  if (links.length === 0) return null;

  return (
    <ul className={cn("flex items-center gap-1", className)}>
      {links.map(({ href, label, Icon }) => (
        <li key={label}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Icon className="size-[18px]" />
          </a>
        </li>
      ))}
    </ul>
  );
}
