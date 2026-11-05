"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { toast } from "sonner";
import { callAction, NETWORK_ERROR_MESSAGE } from "@/lib/action-client";
import { routes } from "@/lib/routes";
import { markAiRunAccepted } from "../actions";
import {
  assistReducer,
  initialAssistState,
  type AiAssistAction,
  type AiAssistState,
  type DeepPartial,
} from "../assist-state";
import type { AiFeature } from "../features";
import type { AiOutput } from "../prompts";
import { readNdjson, type AiRequestBody } from "../stream-protocol";

const SESSION_EXPIRED = "Sesi Studio berakhir. Muat ulang halaman lalu masuk lagi.";
const CONNECTION_CUT = "Koneksi terputus sebelum hasil selesai. Coba lagi.";

/** Respons yang bukan stream AI: sesi habis (dialihkan ke /masuk) atau error server. */
class AssistResponseError extends Error {}

function serverErrorMessage(status: number): string {
  return `Server tidak bisa memproses permintaan AI${status >= 400 ? ` (error ${status})` : ""}. Coba lagi sebentar lagi.`;
}
export const DRAFT_APPLIED = "Draf masuk ke form. Belum tersimpan sampai kamu menekan Simpan.";

/**
 * State + aksi satu tombol Bantu AI: buka/tutup panel, buat/buat ulang (streaming), batal, dan Pakai.
 * Error tampil sebagai toast; form tidak pernah disentuh kecuali lewat `apply` (aksi pengguna).
 */
export function useAiAssist<F extends AiFeature>(feature: F) {
  type Output = AiOutput<F>;
  const [state, dispatch] = useReducer(
    (s: AiAssistState<Output>, a: AiAssistAction) => assistReducer(s, a),
    undefined,
    initialAssistState<Output>,
  );
  const [open, setOpenState] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const acceptedRef = useRef(new Set<string>());

  useEffect(() => () => controllerRef.current?.abort(), []);

  const streaming = state.status === "streaming";

  function cancel() {
    controllerRef.current?.abort();
    controllerRef.current = null;
    dispatch({ type: "stop" });
  }

  /**
   * `input` = nilai form saat ini (lihat schema input fitur di src/features/ai/prompts/).
   * `fresh`: jangan kirim hasil sebelumnya (mis. sasaran berganti ke proyek lain).
   */
  async function generate(input: unknown, options: { instruction?: string; fresh?: boolean } = {}) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    dispatch({ type: "start" });

    const body: AiRequestBody = {
      feature,
      input,
      instruction: options.instruction?.trim() || null,
      // Buat ulang: AI melihat hasil sebelumnya supaya tahu apa yang harus diubah.
      previous: options.fresh ? undefined : state.result?.data,
    };
    let finished = false;
    try {
      const response = await fetch(routes.studio.ai, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
        cache: "no-store",
      });
      // Tanpa sesi, proxy mengarahkan ke /masuk (HTML). Respons non-NDJSON lain = error server.
      if (response.redirected && new URL(response.url).pathname === routes.login) throw new AssistResponseError(SESSION_EXPIRED);
      if (!response.body || !response.headers.get("content-type")?.includes("ndjson")) {
        throw new AssistResponseError(serverErrorMessage(response.status));
      }
      for await (const event of readNdjson(response.body)) {
        if (controller.signal.aborted) return;
        dispatch({ type: "event", event });
        if (event.type === "error") toast.error(event.message);
        if (event.type !== "partial") finished = true;
      }
      if (!finished && !controller.signal.aborted) {
        toast.error(CONNECTION_CUT);
        dispatch({ type: "stop" });
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      // Pesan sendiri (sesi/server) ditampilkan apa adanya; error fetch (jaringan putus) → pesan jaringan.
      toast.error(error instanceof AssistResponseError ? error.message : NETWORK_ERROR_MESSAGE);
      dispatch({ type: "stop" });
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }

  /** Catat bahwa draf run terakhir dipakai (sekali per run). */
  function markAccepted() {
    const runId = state.result?.runId;
    if (!runId || acceptedRef.current.has(runId)) return;
    acceptedRef.current.add(runId);
    void callAction(() => markAiRunAccepted({ runId }));
  }

  /**
   * Tombol Pakai: isi form lewat `fill`, catat dipakai, beri tahu bahwa belum tersimpan, tutup panel.
   * Untuk aksi yang memang menyimpan (mis. "Simpan sebagai ide"), panggil `markAccepted` sendiri.
   */
  function apply(fill: () => void, options: { close?: boolean; message?: string } = {}) {
    fill();
    markAccepted();
    toast.success(options.message ?? DRAFT_APPLIED);
    if (options.close ?? true) setOpen(false);
  }

  function setOpen(next: boolean) {
    if (!next && streaming) cancel();
    setOpenState(next);
  }

  /** Hasil final, atau hasil sementara selama streaming. Pakai hanya aktif untuk hasil final. */
  const view: DeepPartial<Output> | null = streaming
    ? (state.partial as DeepPartial<Output> | null)
    : ((state.result?.data as DeepPartial<Output> | undefined) ?? null);

  return {
    feature,
    open,
    setOpen,
    streaming,
    result: state.result,
    view,
    /** true jika `view` adalah hasil final (boleh dipakai). */
    final: !streaming && state.result !== null,
    generate,
    cancel,
    apply,
    markAccepted,
  };
}

export type AiAssist<F extends AiFeature> = ReturnType<typeof useAiAssist<F>>;
