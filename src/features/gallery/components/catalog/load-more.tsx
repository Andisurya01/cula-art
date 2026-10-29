"use client";

import Link, { useLinkStatus } from "next/link";
import { LoaderCircle } from "lucide-react";
import { galleryCopy } from "../../copy";

function LoadMoreLabel() {
  const { pending } = useLinkStatus();
  return (
    <>
      {/* Ikon selalu dirender (opacity saja yang berubah) supaya tombol tidak bergeser. */}
      <LoaderCircle
        aria-hidden="true"
        className={`size-4 animate-spin transition-opacity ${pending ? "opacity-100" : "opacity-0"}`}
      />
      {pending ? galleryCopy.catalog.loading : galleryCopy.catalog.loadMore}
      <span className="size-4" aria-hidden="true" />
    </>
  );
}

/** "Muat lagi": tautan biasa ke `?halaman=n+1` (jalan tanpa JS), posisi gulir dipertahankan. */
export function LoadMoreLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      prefetch={false}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border px-6 text-sm font-medium transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <LoadMoreLabel />
    </Link>
  );
}
