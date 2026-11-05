import type { AiStreamEvent } from "./stream-protocol";

// State panel Bantu AI (murni, supaya bisa diuji tanpa React). Dipakai useAiAssist.

/** Bentuk hasil sementara: semua field (bertingkat) bisa belum ada. */
export type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export type AiAssistResult<O> = { runId: string; data: O; costUsd: number; model: string; mock: boolean };

export type AiAssistState<O> = {
  status: "idle" | "streaming";
  /** Objek parsial dari event `partial` selama streaming (bentuknya mengikuti output, belum lengkap). */
  partial: unknown;
  /** Hasil terakhir yang lengkap. Tetap ada saat Buat ulang berjalan (sampai hasil baru selesai). */
  result: AiAssistResult<O> | null;
};

export type AiAssistAction =
  | { type: "start" }
  | { type: "event"; event: AiStreamEvent }
  /** Dibatalkan pengguna, atau request gagal sebelum ada hasil (pesan error ditampilkan terpisah). */
  | { type: "stop" };

export function initialAssistState<O>(): AiAssistState<O> {
  return { status: "idle", partial: null, result: null };
}

export function assistReducer<O>(state: AiAssistState<O>, action: AiAssistAction): AiAssistState<O> {
  switch (action.type) {
    case "start":
      return { ...state, status: "streaming", partial: null };
    case "stop":
      return { ...state, status: "idle", partial: null };
    case "event": {
      const { event } = action;
      if (state.status !== "streaming") return state;
      if (event.type === "partial") return { ...state, partial: event.data };
      if (event.type === "error") return { ...state, status: "idle", partial: null };
      return {
        status: "idle",
        partial: null,
        result: {
          runId: event.runId,
          data: event.data as O,
          costUsd: event.costUsd,
          model: event.model,
          mock: event.mock,
        },
      };
    }
  }
}
