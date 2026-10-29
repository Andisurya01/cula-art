"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { galleryCopy } from "../copy";

/** Salin URL karya ke clipboard + toast. Nonaktif di pratinjau Studio. */
export function CopyLinkButton({ url, disabled = false, className }: { url: string; disabled?: boolean; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(galleryCopy.share.copied);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(galleryCopy.share.copyFailed);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={disabled}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-background px-5 text-sm font-medium transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      {copied ? <Check className="size-4" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
      {galleryCopy.share.copyLink}
    </button>
  );
}
