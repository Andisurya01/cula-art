import Link from "next/link";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * Tautan berbentuk tombol pil dengan ikon ↗ (referensi Galeri: "Register a record ↗").
 * `external`: buka di tab baru dengan `rel="noopener noreferrer"` (WhatsApp, Instagram, TikTok).
 */
export function ArrowLink({
  href,
  children,
  variant = "default",
  size = "default",
  arrow = "end",
  external = false,
  className,
  ...rest
}: {
  href: string;
  children: React.ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  arrow?: "start" | "end";
  external?: boolean;
  className?: string;
} & Omit<React.ComponentProps<typeof Link>, "href" | "children" | "className">) {
  return (
    <Button asChild variant={variant} size={size} arrow={arrow} className={className}>
      {external ? (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      ) : (
        <Link href={href} {...rest}>
          {children}
        </Link>
      )}
    </Button>
  );
}
