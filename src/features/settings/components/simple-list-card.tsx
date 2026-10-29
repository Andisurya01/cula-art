"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  createSimpleItem,
  deleteItem,
  moveItem,
  renameSimpleItem,
  setItemActive,
} from "../actions";
import type { SimpleListRow } from "../queries";
import { simpleItemNameSchema, type SimpleListKind } from "../schema";
import { RowActions } from "./row-actions";
import { useRunAction } from "./use-run-action";

/** Kartu daftar sederhana: format, tipe hook, atau item checklist template. */
export function SimpleListCard({
  kind,
  title,
  description,
  placeholder,
  items,
  showUsage = true,
}: {
  kind: SimpleListKind;
  title: string;
  description?: string;
  placeholder: string;
  items: SimpleListRow[];
  showUsage?: boolean;
}) {
  const { pending, run } = useRunAction();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  function onAdd(event: React.FormEvent) {
    event.preventDefault();
    const parsed = simpleItemNameSchema.safeParse(newName);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Nama tidak valid");
      return;
    }
    run(() => createSimpleItem({ kind, name: parsed.data }), {
      success: `"${parsed.data}" ditambahkan`,
      onOk: () => setNewName(""),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada data.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {items.map((item, index) => (
              <li key={item.id} className="flex min-h-11 items-center gap-2 px-2.5 py-1.5">
                {editingId === item.id ? (
                  <RenameForm
                    initialName={item.name}
                    disabled={pending}
                    onCancel={() => setEditingId(null)}
                    onSave={(name) =>
                      run(() => renameSimpleItem({ kind, id: item.id, name }), {
                        success: "Nama diperbarui",
                        onOk: () => setEditingId(null),
                      })
                    }
                  />
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm",
                          !item.isActive && "text-muted-foreground line-through",
                        )}
                      >
                        {item.name}
                      </p>
                      {showUsage && item.usageCount > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Dipakai {item.usageCount} konten
                        </p>
                      )}
                    </div>
                    {!item.isActive && <Badge variant="secondary">Nonaktif</Badge>}
                    <RowActions
                      itemName={item.name}
                      editLabel="Ganti nama"
                      isActive={item.isActive}
                      usageCount={item.usageCount}
                      isFirst={index === 0}
                      isLast={index === items.length - 1}
                      disabled={pending}
                      onMove={(direction) => run(() => moveItem({ kind, id: item.id, direction }))}
                      onEdit={() => setEditingId(item.id)}
                      onToggleActive={() =>
                        run(() => setItemActive({ kind, id: item.id, isActive: !item.isActive }), {
                          success: item.isActive ? "Dinonaktifkan" : "Diaktifkan",
                        })
                      }
                      onDelete={() =>
                        run(() => deleteItem({ kind, id: item.id }), {
                          success: `"${item.name}" dihapus`,
                        })
                      }
                    />
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={onAdd} className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={placeholder}
            aria-label={`Tambah ${title.toLowerCase()}`}
            autoComplete="off"
            maxLength={120}
          />
          <Button type="submit" variant="outline" disabled={pending || newName.trim() === ""}>
            <Plus />
            Tambah
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function RenameForm({
  initialName,
  disabled,
  onSave,
  onCancel,
}: {
  initialName: string;
  disabled: boolean;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = simpleItemNameSchema.safeParse(name);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Nama tidak valid");
      return;
    }
    if (parsed.data === initialName) {
      onCancel();
      return;
    }
    onSave(parsed.data);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-1 items-center gap-1">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
        aria-label="Nama baru"
        autoFocus
        autoComplete="off"
        maxLength={120}
      />
      <Button type="submit" size="icon-sm" aria-label="Simpan nama" disabled={disabled}>
        <Check />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Batal ganti nama"
        onClick={onCancel}
      >
        <X />
      </Button>
    </form>
  );
}
