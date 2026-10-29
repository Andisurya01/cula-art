"use client";

import { useState } from "react";
import { Plus, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { deleteItem, moveItem, setItemActive } from "../actions";
import type { PillarRow } from "../queries";
import { activeShareTotal } from "../utils";
import { PillarFormDialog } from "./pillar-form-dialog";
import { RowActions } from "./row-actions";
import { useRunAction } from "./use-run-action";

type DialogState = { pillar: PillarRow | null } | null;

export function PillarCard({ pillars }: { pillars: PillarRow[] }) {
  const { pending, run } = useRunAction();
  const [dialog, setDialog] = useState<DialogState>(null);
  const total = activeShareTotal(pillars);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pilar konten</CardTitle>
        <CardDescription>
          Pilar yang sudah dipakai ide atau konten tidak bisa dihapus, hanya dinonaktifkan.
        </CardDescription>
        <CardAction>
          <Button type="button" size="sm" onClick={() => setDialog({ pillar: null })}>
            <Plus />
            Pilar
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total porsi pilar aktif</span>
          <span className={cn("font-medium tabular-nums", total !== 100 && "text-destructive")}>
            {total}%
          </span>
        </div>
        {total !== 100 && (
          <Alert>
            <TriangleAlert />
            <AlertDescription>
              Total porsi pilar aktif sebaiknya 100% (sekarang {total}%). Sesuaikan porsi target
              agar perbandingan di Analitik masuk akal.
            </AlertDescription>
          </Alert>
        )}

        {pillars.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada pilar.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {pillars.map((pillar, index) => (
              <li key={pillar.id} className="flex items-center gap-2.5 px-2.5 py-2">
                <span
                  className={cn("size-3 shrink-0 rounded-full", !pillar.isActive && "opacity-40")}
                  style={{ backgroundColor: pillar.color }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p
                      className={cn(
                        "truncate text-sm font-medium",
                        !pillar.isActive && "text-muted-foreground line-through",
                      )}
                    >
                      {pillar.name}
                    </p>
                    {!pillar.isActive && <Badge variant="secondary">Nonaktif</Badge>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    Porsi {pillar.targetShare}%
                    {pillar.usageCount > 0 && ` · dipakai ${pillar.usageCount}×`}
                    {pillar.description && ` · ${pillar.description}`}
                  </p>
                </div>
                <RowActions
                  itemName={pillar.name}
                  isActive={pillar.isActive}
                  usageCount={pillar.usageCount}
                  isFirst={index === 0}
                  isLast={index === pillars.length - 1}
                  disabled={pending}
                  onMove={(direction) =>
                    run(() => moveItem({ kind: "pillar", id: pillar.id, direction }))
                  }
                  onEdit={() => setDialog({ pillar })}
                  onToggleActive={() =>
                    run(
                      () =>
                        setItemActive({ kind: "pillar", id: pillar.id, isActive: !pillar.isActive }),
                      { success: pillar.isActive ? "Pilar dinonaktifkan" : "Pilar diaktifkan" },
                    )
                  }
                  onDelete={() =>
                    run(() => deleteItem({ kind: "pillar", id: pillar.id }), {
                      success: `Pilar "${pillar.name}" dihapus`,
                    })
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {dialog && <PillarFormDialog pillar={dialog.pillar} onClose={() => setDialog(null)} />}
    </Card>
  );
}
