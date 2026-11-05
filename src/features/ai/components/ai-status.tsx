"use client";

import { createContext, useContext } from "react";
import { AI_FEATURES } from "../features";
import type { AiStatus } from "../queries";

const DISABLED: AiStatus = {
  enabled: false,
  mock: false,
  estimates: Object.fromEntries(AI_FEATURES.map((f) => [f, 0])) as AiStatus["estimates"],
};

const AiStatusContext = createContext<AiStatus>(DISABLED);

/** Dipasang di layout Studio: status AI (aktif, mode uji, perkiraan biaya) untuk semua tombol Bantu AI. */
export function AiStatusProvider({ status, children }: { status: AiStatus; children: React.ReactNode }) {
  return <AiStatusContext.Provider value={status}>{children}</AiStatusContext.Provider>;
}

export function useAiStatus(): AiStatus {
  return useContext(AiStatusContext);
}
