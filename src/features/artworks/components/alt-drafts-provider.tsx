"use client";

import { createContext, useContext, useState } from "react";
import {
  mergeAltDrafts,
  removeAltDraft,
  setAltDraft,
  type AltDrafts,
  type AltSuggestion,
  type SavedAlt,
} from "../alt-drafts";

type AltDraftsValue = {
  /** imageId → teks alternatif draf (belum tersimpan). */
  drafts: AltDrafts;
  /** Masukkan saran AI sebagai draf; mengembalikan id foto yang mendapat draf baru. */
  applySuggestions: (suggestions: readonly AltSuggestion[], photos: readonly SavedAlt[]) => string[];
  setDraft: (imageId: string, alt: string) => void;
  clearDraft: (imageId: string) => void;
};

const AltDraftsContext = createContext<AltDraftsValue | null>(null);

/**
 * State bersama halaman detail karya: draf teks alternatif dari Bantu AI "Dari foto" (form detail)
 * yang tampil di editor teks alternatif per foto (kartu Foto). Hanya di browser; tidak pernah disimpan otomatis.
 */
export function ArtworkAltDraftsProvider({ children }: { children: React.ReactNode }) {
  const [drafts, setDrafts] = useState<AltDrafts>({});

  const value: AltDraftsValue = {
    drafts,
    applySuggestions(suggestions, photos) {
      const result = mergeAltDrafts(drafts, suggestions, photos);
      setDrafts(result.drafts);
      return result.applied;
    },
    setDraft: (imageId, alt) => setDrafts((prev) => setAltDraft(prev, imageId, alt)),
    clearDraft: (imageId) => setDrafts((prev) => removeAltDraft(prev, imageId)),
  };

  return <AltDraftsContext.Provider value={value}>{children}</AltDraftsContext.Provider>;
}

export function useAltDrafts(): AltDraftsValue {
  const value = useContext(AltDraftsContext);
  if (!value) throw new Error("useAltDrafts harus dipakai di dalam <ArtworkAltDraftsProvider>.");
  return value;
}
