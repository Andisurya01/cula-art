"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { galleryCopy } from "../copy";

/**
 * Pil "Bagikan": menyalin URL karya ke clipboard + toast. Pembaca layar mendengar "Bagikan (salin
 * tautan)". Nonaktif di pratinjau Studio.
 */
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
    <Button type="button" variant="secondary" size="lg" onClick={copy} disabled={disabled} className={className}>
      {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
      {galleryCopy.share.button}
      <span className="sr-only">{` ${galleryCopy.share.buttonHint}`}</span>
    </Button>
  );
}
