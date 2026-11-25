"use client";

import Link, { useLinkStatus } from "next/link";
import { LoaderCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { galleryCopy } from "../../copy";

function LoadMoreLabel() {
  const { pending } = useLinkStatus();
  return (
    <>
      {/* Ikon selalu dirender (opacity saja yang berubah) supaya tombol tidak bergeser. */}
      <LoaderCircle
        aria-hidden="true"
        className={cn("size-4 animate-spin transition-opacity", pending ? "opacity-100" : "opacity-0")}
      />
      {pending ? galleryCopy.catalog.loading : galleryCopy.catalog.loadMore}
      <span className="size-4" aria-hidden="true" />
    </>
  );
}

/** "Muat lagi": tautan biasa ke `?halaman=n+1` (jalan tanpa JS), posisi gulir dipertahankan. Pil abu. */
export function LoadMoreLink({ href }: { href: string }) {
  return (
    <Link href={href} scroll={false} prefetch={false} className={buttonVariants({ variant: "secondary", size: "lg" })}>
      <LoadMoreLabel />
    </Link>
  );
}
