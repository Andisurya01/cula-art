"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { Medium } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createQuickIdea } from "@/features/ideas/actions";
import { quickIdeaSchema, type QuickIdeaInput } from "@/features/ideas/schema";
import { MEDIUMS, MEDIUM_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { useLayoutUi } from "./ui-store";
import { callAction } from "@/lib/action-client";

export type PillarOption = { id: string; name: string; color: string };

/** Dialog + Ide global. Dibuka dari FAB (HP), tombol bottom nav, sidebar, atau shortcut `N`. */
export function QuickIdeaDialog({ pillars }: { pillars: PillarOption[] }) {
  const open = useLayoutUi((s) => s.quickIdeaOpen);
  const setOpen = useLayoutUi((s) => s.setQuickIdeaOpen);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<QuickIdeaInput>({
    resolver: zodResolver(quickIdeaSchema),
    defaultValues: { title: "" },
  });
  const pillarId = useWatch({ control: form.control, name: "pillarId" });
  const medium = useWatch({ control: form.control, name: "medium" });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "n" && event.key !== "N") return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      if (event.defaultPrevented || isTypingTarget(event.target)) return;
      // Jangan menumpuk di atas dialog, menu, atau listbox lain yang sedang terbuka.
      if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"]')) {
        return;
      }
      event.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) form.reset({ title: "" });
  }

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await callAction(() => createQuickIdea(values));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Ide tersimpan di Bank Ide");
      onOpenChange(false);
      router.refresh();
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Ide baru</DialogTitle>
            <DialogDescription>Cukup judul. Pilar dan medium boleh diisi nanti.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="quick-idea-title">Judul</Label>
            <Input
              id="quick-idea-title"
              autoFocus
              autoComplete="off"
              placeholder="mis. Time-lapse gambar tangan hari ke-30"
              aria-invalid={!!form.formState.errors.title}
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          {pillars.length > 0 && (
            <div className="grid gap-2">
              <Label id="quick-idea-pillar">Pilar</Label>
              <div role="group" aria-labelledby="quick-idea-pillar" className="flex flex-wrap gap-1.5">
                {pillars.map((p) => (
                  <ChipButton
                    key={p.id}
                    active={pillarId === p.id}
                    onClick={() =>
                      form.setValue("pillarId", pillarId === p.id ? undefined : p.id)
                    }
                  >
                    <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </ChipButton>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label id="quick-idea-medium">Medium</Label>
            <div role="group" aria-labelledby="quick-idea-medium" className="flex flex-wrap gap-1.5">
              {MEDIUMS.map((m: Medium) => (
                <ChipButton
                  key={m}
                  active={medium === m}
                  onClick={() => form.setValue("medium", medium === m ? undefined : m)}
                >
                  {MEDIUM_LABELS[m]}
                </ChipButton>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan ide"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Tombol bulat + Ide yang mengambang di HP (di atas bottom nav). */
export function QuickIdeaFab() {
  const setOpen = useLayoutUi((s) => s.setQuickIdeaOpen);
  return (
    <Button
      type="button"
      size="icon-lg"
      aria-label="Tambah ide"
      onClick={() => setOpen(true)}
      className="fixed right-4 bottom-20 z-40 size-12 rounded-full shadow-lg md:hidden"
    >
      <Plus className="size-6" />
    </Button>
  );
}

function ChipButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
