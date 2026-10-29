"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { addChecklistItem, deleteChecklistItem, toggleChecklistItem } from "../actions";
import { checklistAddSchema } from "../schema";
import { errorMessage, unwrap, useSyncedState } from "./client-utils";

type Item = { id: string; label: string; done: boolean; order: number };

/** Checklist produksi: centang (optimistic), tambah, hapus. */
export function ChecklistCard({ contentId, items: initialItems }: { contentId: string; items: Item[] }) {
  const router = useRouter();
  const [items, setItems] = useSyncedState(initialItems);
  const [label, setLabel] = useState("");
  const done = items.filter((i) => i.done).length;

  const toggle = useMutation({
    mutationFn: (vars: { id: string; done: boolean }) => unwrap(toggleChecklistItem(vars)),
    onMutate: ({ id, done: next }) => {
      setItems((current) => current.map((i) => (i.id === id ? { ...i, done: next } : i)));
    },
    onError: (error, { id, done: next }) => {
      setItems((current) => current.map((i) => (i.id === id ? { ...i, done: !next } : i)));
      toast.error(errorMessage(error));
    },
    onSettled: () => router.refresh(),
  });

  const remove = useMutation({
    mutationFn: (item: Item) => unwrap(deleteChecklistItem({ id: item.id })),
    onMutate: (item) => {
      setItems((current) => current.filter((i) => i.id !== item.id));
    },
    onError: (error, item) => {
      setItems((current) => [...current, item].sort((a, b) => a.order - b.order));
      toast.error(errorMessage(error));
    },
    onSettled: () => router.refresh(),
  });

  const add = useMutation({
    mutationFn: (value: string) => unwrap(addChecklistItem({ contentId, label: value })),
    onSuccess: (item) => {
      setItems((current) => [...current, item]);
      setLabel("");
    },
    onError: (error) => toast.error(errorMessage(error)),
    onSettled: () => router.refresh(),
  });

  function onAdd(event: React.FormEvent) {
    event.preventDefault();
    const parsed = checklistAddSchema.safeParse({ contentId, label });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Isi nama item");
      return;
    }
    add.mutate(parsed.data.label);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Checklist
          <span className="text-sm font-normal text-muted-foreground tabular-nums">
            {done}/{items.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3">
        {items.length > 0 && (
          <div
            className="h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={items.length}
            aria-valuenow={done}
            aria-label="Progres checklist"
          >
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(done / items.length) * 100}%` }}
            />
          </div>
        )}
        <ul className="grid gap-1">
          {items.map((item) => (
            <li key={item.id} className="group flex items-center gap-2 rounded-md py-1">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-sm">
                <Checkbox
                  checked={item.done}
                  onCheckedChange={(checked) =>
                    toggle.mutate({ id: item.id, done: checked === true })
                  }
                />
                <span className={cn("min-w-0 break-words", item.done && "text-muted-foreground line-through")}>
                  {item.label}
                </span>
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Hapus item ${item.label}`}
                className="text-muted-foreground md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                onClick={() => remove.mutate(item)}
              >
                <X />
              </Button>
            </li>
          ))}
          {items.length === 0 && (
            <li className="text-sm text-muted-foreground">Belum ada item checklist.</li>
          )}
        </ul>
        <form onSubmit={onAdd} className="flex gap-2">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Tambah item…"
            aria-label="Item checklist baru"
            maxLength={120}
          />
          <Button
            type="submit"
            variant="outline"
            size="icon"
            aria-label="Tambah item"
            disabled={add.isPending}
          >
            <Plus />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
