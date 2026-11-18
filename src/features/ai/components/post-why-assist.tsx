"use client";

import { toast } from "sonner";
import type { DeepPartial } from "../assist-state";
import type { PostWhyOutput, PostWhyReason } from "../prompts/post-why";
import { AiAssistButton, AiAssistPanel, AiOptionCard, AiText } from "./ai-assist-panel";
import { useAiAssist } from "./use-ai-assist";

/** Teks penjelasan lengkap untuk disalin (mis. ke catatan konten berikutnya). */
export function postWhyText(output: PostWhyOutput): string {
  return [
    output.verdict,
    ...output.reasons.map((r) => `- ${r.factor}: ${r.explanation}`),
    `Coba berikutnya: ${output.tryNext}`,
  ].join("\n");
}

/**
 * Detail post → "Kenapa?" (E9): penjelasan AI dari angka yang dihitung aplikasi. Hanya dipasang untuk post
 * yang punya skor relatif. Tidak mengisi atau menyimpan apa pun; "Salin" menyalin teks dan mencatatnya
 * sebagai draf yang dipakai.
 */
export function PostWhyAssist({ postId, title }: { postId: string; title: string }) {
  const assist = useAiAssist("post-why");
  const view = assist.view as DeepPartial<PostWhyOutput> | null;
  const reasons = (view?.reasons ?? []) as DeepPartial<PostWhyReason>[];

  async function copy() {
    const output = assist.result?.data as PostWhyOutput | undefined;
    if (!output) return;
    try {
      await navigator.clipboard.writeText(postWhyText(output));
      assist.markAccepted();
      toast.success("Penjelasan disalin.");
    } catch {
      toast.error("Gagal menyalin. Pilih teksnya secara manual.");
    }
  }

  return (
    <>
      <AiAssistButton label="Kenapa?" ariaLabel={`Bantu AI: kenapa hasil post ${title} begini`} onClick={() => assist.setOpen(true)} />
      <AiAssistPanel
        assist={assist}
        title="Kenapa?"
        description="Penjelasan AI dari angka yang dihitung aplikasi (skor relatif dan post sebanding di platform yang sama). Tidak ada yang disimpan."
        onGenerate={(instruction) => void assist.generate({ postId }, { instruction })}
      >
        {view && (
          <div className="space-y-3">
            {view.verdict && <AiText className="text-sm font-medium">{view.verdict}</AiText>}
            {reasons.map((reason, i) => (
              <AiOptionCard key={i} label={reason.factor}>
                <AiText>{reason.explanation}</AiText>
              </AiOptionCard>
            ))}
            {view.tryNext && (
              <AiOptionCard label="Coba di post berikutnya" onUse={() => void copy()} useLabel="Salin semua" disabled={!assist.final}>
                <AiText>{view.tryNext}</AiText>
              </AiOptionCard>
            )}
          </div>
        )}
      </AiAssistPanel>
    </>
  );
}
