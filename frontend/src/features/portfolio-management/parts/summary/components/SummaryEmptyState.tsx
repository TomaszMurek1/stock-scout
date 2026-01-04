import React from "react";
import { TrendingUp } from "lucide-react";

export const SummaryEmptyState = () => (
    <div className="p-12 text-center bg-white rounded-xl border border-dashed border-gray-300 shadow-sm">
      <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-800">No active holdings</h3>
      <p className="text-gray-500 max-w-sm mx-auto mt-2">
        Add your first stock to start tracking performance analysis and returns.
      </p>
    </div>
);

export const SummaryLoadingState = () => (
    <div className="p-12 text-center bg-white rounded-xl border border-dashed border-gray-300 shadow-sm">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-800">Calculating Performance...</h3>
      <p className="text-gray-500 max-w-sm mx-auto mt-2">
        We're crunching the numbers for your portfolio. This usually takes a few seconds.
      </p>
    </div>
);
