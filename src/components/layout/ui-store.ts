"use client";

import { create } from "zustand";

type LayoutUiState = {
  quickIdeaOpen: boolean;
  setQuickIdeaOpen: (open: boolean) => void;
};

export const useLayoutUi = create<LayoutUiState>((set) => ({
  quickIdeaOpen: false,
  setQuickIdeaOpen: (quickIdeaOpen) => set({ quickIdeaOpen }),
}));
