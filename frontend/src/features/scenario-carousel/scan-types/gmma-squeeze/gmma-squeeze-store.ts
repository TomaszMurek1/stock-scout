import { create } from "zustand";
import { IGmmaSqueezeResultItem } from "./gmma-squeeze-form.types";

interface GmmaScanStore {
  /** Cached scan results */
  results: IGmmaSqueezeResultItem[];
  /** Timestamp of last successful scan */
  lastScanAt: number | null;
  /** Store results from a completed scan */
  setResults: (data: IGmmaSqueezeResultItem[]) => void;
  /** Clear cached results */
  clearResults: () => void;
}

export const useGmmaScanStore = create<GmmaScanStore>((set) => ({
  results: [],
  lastScanAt: null,
  setResults: (data) => set({ results: data, lastScanAt: Date.now() }),
  clearResults: () => set({ results: [], lastScanAt: null }),
}));
