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
          <span className="font-semibold text-blue-900">How the Break Even Point Scanner Works</span>
        </div>
        {expanded ? <ChevronUp size={20} className="text-blue-600" /> : <ChevronDown size={20} className="text-blue-600" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 text-sm text-gray-700 space-y-4">
          <p className="text-gray-600">
            This scanner identifies companies that are transitioning from loss-making to profitability. It focuses on turnaround candidates by comparing recent performance against the previous fiscal year.
          </p>

          <div className="space-y-3">
            <div className="border-l-4 border-red-500 pl-3">
              <h4 className="font-semibold text-gray-800">1. Was Unprofitable (Last Year)</h4>
              <p>The company must have reported a <strong>Net Loss</strong> in its last full official Annual Report. This ensures we are targeting true turnaround stories, not companies that are already consistently profitable.</p>
            </div>

            <div className="border-l-4 border-green-500 pl-3">
              <h4 className="font-semibold text-gray-800">2. Is Improving (TTM Trend)</h4>
              <p>The company's performance over the <strong>Trailing 12 Months (TTM)</strong> must be better than the last full year. We calculate TTM by summing the Net Income of the last 4 quarters.</p>
              <ul className="list-disc ml-5 mt-1 text-xs text-gray-600">
                <li>Condition: <code>Current TTM Net Income &gt; Last Annual Net Income</code></li>
              </ul>
            </div>

            <div className="border-l-4 border-blue-500 pl-3">
              <h4 className="font-semibold text-gray-800">3. Approaching Profitability</h4>
              <p>The company is now operating close to the break-even point. We calculate the TTM Net Margin and check if it falls within your specified threshold (e.g., +/- 5%).</p>
              <ul className="list-disc ml-5 mt-1 text-xs text-gray-600">
                <li><code>TTM Margin = (TTM Net Income / TTM Revenue) * 100</code></li>
              </ul>
            </div>
          </div>

          <div className="bg-white p-3 rounded border border-gray-200 mt-4">
            <h4 className="font-semibold text-gray-800 mb-2">Strategy Tip</h4>
            <p>
              Candidates found by this scan are often at a pivotal moment. Look for improved efficiency or revenue growth driving the narrowing loss.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
