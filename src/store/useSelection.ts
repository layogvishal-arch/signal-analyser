// Session-scoped selection state — which email is currently focused in the
// inbox. Used by the PM Debug Panel to show per-email score detail.
// Not persisted; resets on reload.

"use client";

import { create } from "zustand";

interface SelectionState {
  selectedEmailId: string | null;
  select: (id: string | null) => void;
}

export const useSelection = create<SelectionState>((set) => ({
  selectedEmailId: null,
  select: (id) => set({ selectedEmailId: id }),
}));
