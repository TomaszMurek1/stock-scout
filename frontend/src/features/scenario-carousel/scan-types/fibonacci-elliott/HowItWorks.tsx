import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { useState } from "react";

export const HowItWorksSection = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-6 border border-blue-200 rounded-lg bg-blue-50">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-blue-100 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <Info className="text-blue-600" size={20} />
          <span className="font-semibold text-blue-900">How the Fibonacci & Elliott Scanner Works</span>
        </div>
        {expanded ? <ChevronUp size={20} className="text-blue-600" /> : <ChevronDown size={20} className="text-blue-600" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 text-sm text-gray-700 space-y-4">
          <p className="text-gray-600">
            This scanner automatically identifies Elliott Wave patterns (5-wave impulses) and calculates a risk/reward score based on Fibonacci targets.
          </p>

          <div className="space-y-3">
            <div className="border-l-4 border-green-500 pl-3">
              <h4 className="font-semibold text-gray-800">1. Pattern Recognition</h4>
              <p>Detects valid 5-wave impulse structures based on strict Elliott Wave rules:</p>
              <ul className="list-disc ml-5 mt-1 text-xs text-gray-600">
                <li>Wave 2 cannot retrace 100% of Wave 1</li>
                <li>Wave 3 cannot be the shortest impulse wave</li>
                <li>Wave 4 cannot overlap into Wave 1 territory</li>
              </ul>
            </div>

            <div className="border-l-4 border-blue-500 pl-3">
              <h4 className="font-semibold text-gray-800">2. Kelly Fraction (Risk Score)</h4>
              <p>Calculates the optimal position size (Kelly Criterion) based on the historical success rate of detected patterns for this ticker.</p>
              <ul className="list-disc ml-5 mt-1 text-xs text-gray-600">
                <li><strong>&gt; 0.2 (20%)</strong>: Strong edge. High probability set up or very favorable risk/reward.</li>
                <li><strong>0.1 - 0.2</strong>: Moderate edge. Standard set up.</li>
                <li><strong>0.0</strong>: No clear edge or no valid patterns found.</li>
              </ul>
            </div>

            <div className="border-l-4 border-purple-500 pl-3">
              <h4 className="font-semibold text-gray-800">3. Pivot Threshold</h4>
              <p>Determines the sensitivity of wave detection. Lower values (e.g., 5%) detect smaller waves; higher values (e.g., 10%) detect major trend moves.</p>
            </div>
          </div>

          <div className="bg-white p-3 rounded border border-gray-200 mt-4">
            <h4 className="font-semibold text-gray-800 mb-2">Strategy Tip</h4>
            <p>
              Focus on stocks with <strong>Kelly Fraction &gt; 0.2</strong>. This indicates a historically proven edge for the identified pattern on that specific asset.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
