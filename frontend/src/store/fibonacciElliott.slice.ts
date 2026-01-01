import { FiboWaveResult } from "@/features/scenario-carousel/scan-types/fibonacci-elliott/fibonacci-elliott-output";

export interface ScanParams {
  pivotThreshold: number;
}

export interface FibonacciElliottState {
  scanResults: FiboWaveResult[] | null;
  scanParams: ScanParams;
  isNavigatingToChart: boolean;
}

export interface FibonacciElliottSlice {
  fibonacciElliott: FibonacciElliottState;
  setScanResults: (results: FiboWaveResult[] | null) => void;
  setScanParams: (params: ScanParams) => void;
  clearScanResults: () => void;
  setNavigatingToChart: (isNavigating: boolean) => void;
}

export const createFibonacciElliottSlice = (set: any): FibonacciElliottSlice => {
  return {
    fibonacciElliott: {
      scanResults: null,
      scanParams: {
        pivotThreshold: 0.05, // Default
      },
      isNavigatingToChart: false,
    },

    setScanResults: (results) =>
      set(
        (state: any) => ({
          fibonacciElliott: {
            ...state.fibonacciElliott,
            scanResults: results,
          },
        }),
        false,
        `fibonacciElliott/setScanResults`
      ),

    setScanParams: (params) =>
      set(
        (state: any) => ({
          fibonacciElliott: {
            ...state.fibonacciElliott,
            scanParams: params,
          },
        }),
        false,
        `fibonacciElliott/setScanParams`
      ),

    clearScanResults: () =>
      set(
        (state: any) => ({
          fibonacciElliott: {
            ...state.fibonacciElliott,
            scanResults: null,
            // We usually don't clear params so they persist for next scan
          },
        }),
        false,
        `fibonacciElliott/clearScanResults`
      ),

    setNavigatingToChart: (isNavigating) =>
      set(
        (state: any) => ({
          fibonacciElliott: {
            ...state.fibonacciElliott,
            isNavigatingToChart: isNavigating,
          },
        }),
        false,
        `fibonacciElliott/setNavigatingToChart`
      ),
  };
};
