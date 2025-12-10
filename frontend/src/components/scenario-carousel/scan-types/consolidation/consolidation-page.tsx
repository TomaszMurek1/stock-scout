import React from "react";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import BreakoutForm from "../breakout-form/breakout-form";

export default function ConsolidationPage() {
  return (
    <FormCardGenerator
      title="Consolidation & Breakout Scan"
      subtitle={
        <div className="space-y-2">
          <p>
            Find stocks that have been <strong>consolidating</strong> (trading in a tight range) and are ready for a potential <strong>breakout</strong>.
          </p>
          <ul className="list-disc list-inside text-sm text-gray-700 ml-2">
            <li><strong>Consolidation Period:</strong> Number of days the stock has been trading within a narrow range.</li>
            <li><strong>Breakout Percentage:</strong> The minimum price movement above the consolidation range to confirm a breakout.</li>
            <li><strong>Volume Increase:</strong> The percentage increase in volume that confirms strong buying interest during the breakout.</li>
            <li><strong>Why it matters:</strong> Consolidation often precedes significant price movements. A breakout with high volume suggests strong momentum.</li>
          </ul>
        </div>
      }
    >
      <BreakoutForm />
    </FormCardGenerator>
  );
}
