import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { useState } from "react";

export const HowItWorksSection = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-6 border border-blue-200 rounded-lg bg-blue-50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-blue-100 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <Info className="text-blue-600" size={20} />
          <span className="font-semibold text-blue-900">How the Wyckoff Scanner Works</span>
        </div>
        {expanded ? <ChevronUp size={20} className="text-blue-600" /> : <ChevronDown size={20} className="text-blue-600" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 text-sm text-gray-700 space-y-4">
          <p className="text-gray-600">
            The scanner analyzes stocks using <strong>5 observable criteria</strong>, each scored 0-100%. 
            You can customize the importance (weight) of each criterion below.
          </p>

          <div className="space-y-3">
            <div className="border-l-4 border-green-500 pl-3">
              <h4 className="font-semibold text-gray-800">1. Trading Range (Default: 25%)</h4>
              <p>Looks for horizontal price consolidation within 5-20% range width. Counts support/resistance touches. Longer duration = higher score.</p>
              <p className="text-xs text-gray-500 italic mt-1">Example: "Trading range of 8.3% over 47 days with 6 support touches"</p>
            </div>

            <div className="border-l-4 border-blue-500 pl-3">
              <h4 className="font-semibold text-gray-800">2. Volume Pattern (Default: 25%)</h4>
              <p><strong>Declining volume</strong> = bullish (supply drying up). <strong>Higher volume on down days</strong> = accumulation (smart money absorbing). Detects volume spikes at support.</p>
              <p className="text-xs text-gray-500 italic mt-1">Example: "Volume declined 23%, 1.4x higher on down days (absorption evident)"</p>
            </div>

            <div className="border-l-4 border-purple-500 pl-3">
              <h4 className="font-semibold text-gray-800">3. Spring (Default: 20%)</h4>
              <p>Detects brief drops <strong>below support</strong> followed by quick recovery. Classic "shakeout" before markup (Phase C). High score if detected, 0 if not.</p>
              <p className="text-xs text-gray-500 italic mt-1">Example: "Spring detected: dropped to $42.10, recovered to $44.50"</p>
            </div>

            <div className="border-l-4 border-yellow-500 pl-3">
              <h4 className="font-semibold text-gray-800">4. Support Tests (Default: 15%)</h4>
              <p>Multiple successful tests of support. <strong>Higher lows</strong> on each test = strength building. Declining volume on tests = less selling pressure.</p>
              <p className="text-xs text-gray-500 italic mt-1">Example: "4 tests showing higher lows (+2.3%), declining volume"</p>
            </div>

            <div className="border-l-4 border-red-500 pl-3">
              <h4 className="font-semibold text-gray-800">5. Signs of Strength (Default: 15%)</h4>
              <p>Wide-spread up days on high volume. Breaking above resistance temporarily shows demand entering.</p>
              <p className="text-xs text-gray-500 italic mt-1">Example: "2 wide-spread up days approaching resistance"</p>
            </div>
          </div>

          <div className="bg-white p-3 rounded border border-gray-200 mt-4">
            <h4 className="font-semibold text-gray-800 mb-2">Overall Score</h4>
            <p>
              The weighted average of all 5 criteria determines the overall score (0-100%). 
              <strong> Weights must sum to 100%</strong>. Adjust them below based on what matters most to your strategy.
            </p>
          </div>

          <div className="bg-amber-50 p-3 rounded border border-amber-200 mt-2">
            <h4 className="font-semibold text-amber-900 mb-1">📊 For Longer Consolidations:</h4>
            <ul className="text-xs space-y-1 ml-4 list-disc">
              <li>Increase <strong>Lookback Period</strong> to 180-365 days</li>
              <li>The scanner looks at the last 60 days within your window for the "recent range"</li>
              <li>Check the narrative in results - it tells you the actual consolidation duration</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
