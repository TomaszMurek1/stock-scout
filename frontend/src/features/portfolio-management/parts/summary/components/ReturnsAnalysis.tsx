import React from "react";
import { Card, Label, PercentValue } from "./SummaryShared";
import { Period } from "../../../../types";

interface ReturnsAnalysisProps {
  breakdown: any;
  perf: any;
  selectedPeriod: Period;
}

export const ReturnsAnalysis = ({ breakdown, perf, selectedPeriod }: ReturnsAnalysisProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Simple Return - PRIMARY METRIC (most intuitive) */}
      <Card className={`${
        (breakdown.invested?.simple_return_pct || 0) >= 0 
          ? 'border-l-4 border-emerald-500' 
          : 'border-l-4 border-red-500'
      }`}>
        <Label tooltip={`💰 ACTUAL MONEY GAINED/LOST
        
 Did I make money?

 How it works:
 (Ending - Beginning - Money Added) ÷ Total Invested

 Example:
 Started 11k zł, added 142k zł, ended 152k zł
 = Lost 1.9k zł on 153k total = -1.2%

 Includes FX? YES - USD stocks lose value if PLN strengthens

 Why it differs: Cares about HOW MUCH money you had at different times. Adding 140k before a drop = bigger loss.`}>
           💰 Money Made/Lost
        </Label>
        <PercentValue 
          value={breakdown.invested?.simple_return_pct ? parseFloat(breakdown.invested.simple_return_pct) : 0} 
        />
        <div className="text-xs text-gray-500 mt-1">Simple Return</div>
      </Card>
      
      {/* 2. TTWR Invested - Stock picking quality */}
      <Card>
        <Label tooltip={`🎯 STOCK PICKING SKILL (HYPOTHETICAL)

 Were my stock picks good (ignoring when I bought)?

 How it works:
 Imagine 100 zł invested at START of period
 Each day: grows/shrinks by your portfolio's daily %
 ASSUMES you bought all stocks on day 1 (not actual dates)

 Example (YTD):
 100 zł on Jan 1
 Day 1: +4% → 104 zł
 Day 2: -2% → 101.92 zł
 ...
 Dec 14: 123.87 zł = +23.87%

 HYPOTHETICAL? YES - not your actual money, just a measurement tool

 Includes FX? YES - PLN strengthening = USD stocks lose PLN value

 Why can be positive when you lost money:
 Treats every day equally. 10 months up (small capital) outweighs 1 month down (large capital).`}>
           🎯 Pick Quality
        </Label>
        <PercentValue value={perf.ttwr_invested?.[selectedPeriod] ?? 0} />
         <div className="text-xs text-gray-500 mt-1">TTWR (Invested Only)</div>
      </Card>
      
      {/* 3. TTWR Portfolio - Overall strategy including cash */}
      <Card>
        <Label tooltip={`📊 OVERALL STRATEGY (HYPOTHETICAL)

 Was my strategy good (including keeping cash)?

 How it works:
 (Avg % Cash × 0%) + (Avg % Stocks × Pick Quality)
 ASSUMES all purchases happened at period start

 Example:
 70% cash + 30% stocks at +24%
 = 30% × 24% = +7.2%

 HYPOTHETICAL? YES - same 100 zł concept

 Includes FX? YES - stocks and foreign cash both include FX

 Why POSITIVE when you LOST money:
 Measures strategy quality over TIME, not dollars. Like a fund manager's skill rating vs your account balance. Good strategies can lose money with bad timing.`}>
           📊 Strategy Quality
        </Label>
        <PercentValue value={perf.ttwr?.[selectedPeriod] ?? 0} />
        <div className="text-xs text-gray-500 mt-1">TTWR (Portfolio)</div>
      </Card>
      
      {/* 4. MWRR - Personal IRR */}
      <Card>
        <Label tooltip={`🏦 YOUR PERSONAL IRR (ACTUAL)

 What was my return considering WHEN I invested?

 How it works:
 Interest rate that produces your exact results
 PUNISHES bad timing, REWARDS good timing

 Example:
 Added 140k on Nov 16
 Value dropped 5% by Dec 14
 That entire 140k sat through the drop

 ACTUAL? YES - uses your real amounts and dates

 Includes FX? YES - all holdings in PLN

 Why it's usually worst:
 Hard to time perfectly! Most add money when they have it (often after gains = high prices). This is NORMAL.`}>
           🏦 Personal Return
        </Label>
        <PercentValue value={perf.mwrr?.[selectedPeriod] ?? 0} />
         <div className="text-xs text-gray-500 mt-1">MWRR (IRR)</div>
      </Card>
    </div>
  );
};
