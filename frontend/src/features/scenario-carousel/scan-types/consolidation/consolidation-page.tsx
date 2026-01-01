import React from "react";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import FormSubtitle from "@/components/shared/forms/FormSubtitle";
import BreakoutForm from "../breakout-form/breakout-form";
import BackToCarousel from "@/components/shared/BackToCarousel";
import { Minus } from "lucide-react";

export default function ConsolidationPage() {
  return (
    <div className="container">
      <BackToCarousel />
      <FormCardGenerator
      title="Consolidation & Breakout Scan"
      icon={Minus}
      subtitle={
        <FormSubtitle
          description={
            <>
              Find stocks that have been <strong>consolidating</strong> (trading in a tight range) and are ready for a potential <strong>breakout</strong>.
            </>
          }
          bulletPoints={[
            {
              label: "Consolidation Period",
              description: "Number of days the stock has been trading within a narrow range.",
            },
            {
              label: "Breakout Percentage",
              description: "The minimum price movement above the consolidation range to confirm a breakout.",
            },
            {
              label: "Volume Increase",
              description: "The percentage increase in volume that confirms strong buying interest during the breakout.",
            },
            {
              label: "Why it matters",
              description: "Consolidation often precedes significant price movements. A breakout with high volume suggests strong momentum.",
            },
          ]}
        />
      }
    >
      <BreakoutForm />
    </FormCardGenerator>
    </div>
  );
}
