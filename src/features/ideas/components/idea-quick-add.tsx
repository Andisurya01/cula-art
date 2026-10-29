"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createQuickIdea } from "../actions";
import { callAction } from "@/lib/action-client";

/** Tambah cepat: ketik judul lalu Enter. Ide masuk berstatus Baru. */
export function IdeaQuickAdd() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || pending) return;
    startTransition(async () => {
      const result = await callAction(() => createQuickIdea({ title }));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Ide tersimpan");
      setTitle("");
      inputRef.current?.focus();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Tulis ide cepat lalu tekan Enter…"
        aria-label="Judul ide baru"
        autoComplete="off"
        maxLength={200}
        enterKeyHint="done"
        disabled={pending}
        className="h-10"
      />
      <Button
        type="submit"
        size="icon-lg"
        aria-label="Tambah ide"
        disabled={pending || !title.trim()}
      >
        <Plus />
      </Button>
    </form>
  );
}
