"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { Medium } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { callAction } from "@/lib/action-client";
import { createIdea } from "@/features/ideas/actions";
import type { DeepPartial } from "../assist-state";
import { idByName } from "../format";
import type { ProjectIdea } from "../prompts/project-ideas";
import { AiAssistButton, AiAssistPanel, AiOptionCard, AiText } from "./ai-assist-panel";
import { useAiAssist } from "./use-ai-assist";

export type ProjectOption = { id: string; title: string; medium: Medium };

/**
 * "Ide dari proyek": 3-5 ide konten berseri dari proyek berjalan. Dipakai di detail Proyek (proyek tetap)
 * dan Bank Ide (pilih proyek). Setiap ide bisa disimpan ke Bank Ide lewat aksi pengguna "Simpan sebagai ide".
 */
export function ProjectIdeasAssist({
  project,
  projects,
  pillars,
  label = "Ide dari proyek",
  className,
}: {
  /** Proyek tetap (detail Proyek). */
  project?: ProjectOption;
  /** Daftar proyek untuk dipilih di panel (Bank Ide). Diabaikan jika `project` diisi. */
  projects?: ProjectOption[];
  pillars: { id: string; name: string }[];
  label?: string;
  className?: string;
}) {
  const assist = useAiAssist("project-ideas");
  const [selectedId, setSelectedId] = useState<string>(project?.id ?? "");
  const [includePhotos, setIncludePhotos] = useState(true);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);

  const current = project ?? projects?.find((p) => p.id === selectedId);
  // Proyek yang dipakai untuk hasil yang sedang tampil: menyimpan ide selalu memakai proyek ini,
  // walau pilihan di panel sudah diganti ke proyek lain.
  const [generatedFor, setGeneratedFor] = useState<ProjectOption | null>(null);
  const ideas = (assist.view?.ideas ?? []) as DeepPartial<ProjectIdea>[];
  const runId = assist.result?.runId ?? "";

  function generate(instruction: string) {
    if (!current) return;
    // Proyek lain → jangan kirim hasil proyek sebelumnya sebagai "hasil sebelumnya".
    const fresh = generatedFor?.id !== current.id;
    setGeneratedFor(current);
    void assist.generate({ projectId: current.id, includePhotos }, { instruction, fresh });
  }

  async function save(idea: ProjectIdea, key: string) {
    const source = generatedFor;
    if (!source) return;
    setSaving(key);
    const result = await callAction(() =>
      createIdea({
        title: idea.title.slice(0, 200),
        pillarId: idByName(pillars, idea.pillar),
        medium: source.medium,
        notes: ideaNotes(idea, source.title).slice(0, 2000),
        refUrl: "",
        potential: null,
        effort: null,
      }),
    );
    setSaving(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSaved((prev) => new Set(prev).add(key));
    assist.markAccepted();
    toast.success("Ide tersimpan di Bank Ide.");
  }

  return (
    <>
      <AiAssistButton label={label} className={className} onClick={() => assist.setOpen(true)} />
      <AiAssistPanel
        assist={assist}
        title="Ide dari proyek"
        description="3-5 ide konten dari tahap, catatan, dan foto progres proyek. Ide hanya masuk Bank Ide jika kamu menekan Simpan sebagai ide."
        generateDisabledReason={current ? null : "Pilih proyek dulu."}
        onGenerate={generate}
        controls={
          <div className="grid gap-2">
            {!project && projects && (
              <Select value={selectedId} onValueChange={setSelectedId} disabled={assist.streaming}>
                <SelectTrigger className="w-full" aria-label="Proyek">
                  <SelectValue placeholder={projects.length ? "Pilih proyek" : "Belum ada proyek"} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex items-center gap-2">
              <Checkbox
                id="ai-project-photos"
                checked={includePhotos}
                onCheckedChange={(value) => setIncludePhotos(value === true)}
                disabled={assist.streaming}
              />
              <Label htmlFor="ai-project-photos" className="text-xs font-normal">
                Sertakan maks. 4 foto progres terbaru (biaya sedikit lebih besar)
              </Label>
            </div>
          </div>
        }
      >
        {!project && generatedFor && ideas.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Hasil untuk proyek <span className="font-medium text-foreground">{generatedFor.title}</span>
          </p>
        )}
        {ideas.map((idea, i) => {
          const key = `${runId}:${i}`;
          const isSaved = saved.has(key);
          return (
            <AiOptionCard
              key={i}
              label={idea.seriesPart ? `Part ${idea.seriesPart}` : `Ide ${i + 1}`}
              actions={
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!assist.final || isSaved || saving !== null}
                  onClick={() => save(idea as ProjectIdea, key)}
                >
                  {isSaved ? "Tersimpan" : saving === key ? "Menyimpan…" : "Simpan sebagai ide"}
                </Button>
              }
            >
              <p className="font-medium">{idea.title}</p>
              {idea.angle && <AiText>{idea.angle}</AiText>}
              <div className="flex flex-wrap gap-1">
                {[idea.pillar, idea.format, idea.hookType].filter(Boolean).map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
              {idea.reason && <p className="text-xs text-muted-foreground">{idea.reason}</p>}
            </AiOptionCard>
          );
        })}
      </AiAssistPanel>
    </>
  );
}

/** Catatan ide yang disimpan: sudut pandang + saran format/hook (Idea tidak punya kolom format/hook). */
function ideaNotes(idea: ProjectIdea, projectTitle: string): string {
  const suggestions = [idea.format && `format ${idea.format}`, idea.hookType && `tipe hook ${idea.hookType}`]
    .filter(Boolean)
    .join(", ");
  return [
    idea.angle,
    suggestions && `Saran AI: ${suggestions}.`,
    idea.reason,
    `Dari proyek: ${projectTitle}${idea.seriesPart ? ` (Part ${idea.seriesPart})` : ""}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
