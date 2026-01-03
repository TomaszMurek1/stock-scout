// src/components/Summary.tsx
import React from "react";
import { ArrowUpRight, ArrowDownRight, HelpCircle, PieChart, DollarSign, Wallet, TrendingUp } from "lucide-react";
import { CurrencyCode, formatCurrency, formatPercent, currencyLocaleMap } from "./summary.helpers";
import { Portfolio, PortfolioPerformance, Period } from "../../types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SummaryProps {
  portfolio: Portfolio;
  performance: PortfolioPerformance;
  holdings?: any[]; // Optional list of holdings
  selectedPeriod: Period;
  onPeriodChange: (p: Period) => void;
}

const PERIODS: Period[] = ["1d", "1w", "1m", "3m", "6m", "1y", "ytd", "itd"];

const PeriodSelector = ({ selected, onSelect }: { selected: Period; onSelect: (p: Period) => void }) => (
  <div className="flex bg-gray-100 p-1 rounded-lg">
    {PERIODS.map((p) => (
      <button
        key={p}
        onClick={() => onSelect(p)}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
          selected === p
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
        }`}
      >
        {p.toUpperCase()}
      </button>
    ))}
  </div>
);

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-200 ${className}`}>
    {children}
  </div>
);

const Label = ({ children, tooltip }: { children: React.ReactNode; tooltip?: string }) => (
  <div className="flex items-center gap-1.5 text-sm text-gray-500 font-medium mb-1">
    {children}
    {tooltip && (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger>
            <HelpCircle className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs bg-slate-900 text-white p-3 rounded-lg text-xs leading-relaxed whitespace-pre-line">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )}
  </div>
);

const Value = ({
  value,
  currency,
  className = "",
}: {
  value: number;
  currency?: CurrencyCode;
  className?: string;
}) => {
  const formatted = currency
    ? value.toLocaleString(currencyLocaleMap[currency], {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return <div className={`text-2xl font-bold text-gray-900 ${className}`}>{formatted}</div>;
};

const PercentValue = ({ value }: { value: number }) => {
  const isPositive = value >= 0;
  const color = isPositive ? "text-green-600" : "text-red-600";
  return (
    <div className={`flex items-center text-lg font-bold ${color}`}>
      {isPositive ? <ArrowUpRight className="w-5 h-5 mr-1" /> : <ArrowDownRight className="w-5 h-5 mr-1" />}
      {formatPercent(value * 100)}
    </div>
  );
};

const DataRow = ({
  label,
  value,
  currency,
  isBold = false,
  className = "",
  valueClassName = "",
}: {
  label: string;
  value: number;
  currency?: CurrencyCode;
  isBold?: boolean;
  className?: string;
  valueClassName?: string;
}) => (
  <div className={`flex justify-between items-center py-2 border-b border-gray-50 last:border-0 ${className}`}>
    <span className={`text-sm ${isBold ? "text-gray-800 font-medium" : "text-gray-500"}`}>{label}</span>
    <span className={`${isBold ? "font-bold text-gray-900" : "text-gray-700 font-medium"} ${valueClassName}`}>
      {currency
        ? formatCurrency(value, currency)
        : value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  </div>
);

export default function Summary({ portfolio, performance, holdings, selectedPeriod, onPeriodChange }: SummaryProps) {
  // const [selectedPeriod, setSelectedPeriod] = useState<Period>("ytd"); // Lifted up

  const { currency } = portfolio;
  const breakdown = performance?.breakdowns?.[selectedPeriod] || performance?.breakdowns?.ytd || performance?.breakdowns?.itd;
  const itd = performance?.breakdowns?.itd;
  const perf = performance?.performance;

  const hasPerformance = !!(breakdown && itd && perf);
  const hasHoldings = (portfolio.invested_value_current > 0) || (holdings && holdings.length > 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
           <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><PieChart size={20} /></div>
            <Label tooltip="Current market value of all your active holdings.">Invested Value</Label>
          </div>
          <Value value={portfolio.invested_value_current} currency={currency} />
        </Card>
        
        {/* NEW CARD: Net Deposit */}
        <Card>
           <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><ArrowDownRight size={20} /></div>
            <Label tooltip="Total Net Deposits (Deposits - Withdrawals). This is the actual cash you have put into the portfolio.">Net Deposits</Label>
          </div>
          <Value value={portfolio.net_invested_cash} currency={currency} />
        </Card>

        <Card>
           <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><DollarSign size={20} /></div>
            <Label>Cash Available</Label>
          </div>
          <Value value={portfolio.cash_available} currency={currency} />
        </Card>
        <Card>
           <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Wallet size={20} /></div>
            <Label>Total Value</Label>
          </div>
          <Value value={portfolio.total_value} currency={currency} />
        </Card>
        
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600"><TrendingUp size={20} /></div>
             <Label tooltip="Total Profit or Loss on your investments (Current Value - Net Cost). Includes both realized and unrealized gains.">Total PnL (ITD)</Label>
          </div>
          <Value 
            value={itd?.invested ? itd.invested.capital_gains : (itd?.pnl?.unrealized_gains_residual || 0)} 
            currency={currency} 
            className={(itd?.invested ? itd.invested.capital_gains : (itd?.pnl?.unrealized_gains_residual || 0)) >= 0 ? "text-green-600" : "text-red-600"}
          />
        </Card>
      </div>

      {!hasHoldings ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-gray-300 shadow-sm">
          <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800">No active holdings</h3>
          <p className="text-gray-500 max-w-sm mx-auto mt-2">
            Add your first stock to start tracking performance analysis and returns.
          </p>
        </div>
      ) : !hasPerformance ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-gray-300 shadow-sm">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800">Calculating Performance...</h3>
          <p className="text-gray-500 max-w-sm mx-auto mt-2">
            We're crunching the numbers for your portfolio. This usually takes a few seconds.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between pt-2">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gray-500" />
                Returns Analysis ({selectedPeriod.toUpperCase()})
            </h3>
            <PeriodSelector selected={selectedPeriod} onSelect={onPeriodChange} />
          </div>

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
           
           {/* Warning badge for timing paradox */}
           {/* {breakdown.metrics_context?.warning_type === 'timing_paradox' && (
             <div className="mt-3 p-2 bg-amber-50 border border-amber-300 rounded-md text-xs text-amber-800">
               <div className="flex items-center gap-1.5">
                 <span className="text-base">⚠️</span>
                 <span className="font-semibold">Good picks, bad timing</span>
               </div>
               <div className="mt-1 text-amber-700">
                 Your stocks performed well, but you added money right before a dip
               </div>
             </div>
           )}
           
           {breakdown.metrics_context?.warning_type === 'timing_win' && (
             <div className="mt-3 p-2 bg-emerald-50 border border-emerald-300 rounded-md text-xs text-emerald-800">
               <div className="flex items-center gap-1.5">
                 <span className="text-base">✅</span>
                 <span className="font-semibold">Excellent timing!</span>
               </div>
               <div className="mt-1 text-emerald-700">
                 You added money at the perfect time
               </div>
             </div>
           )} */}
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

       {/* Detailed Breakdown */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Selected Period Analysis */}
          <Card className="border-l-4 border-blue-500 pl-5">
             <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                {selectedPeriod.toUpperCase()} Analysis (Invested)
             </h4>
             {breakdown.invested ? (
                 <div className="space-y-1">
                    <DataRow label="Beginning Invested" value={breakdown.invested.beginning_value} currency={currency} className="opacity-75" />
                    <DataRow label="Net Purchases" value={breakdown.invested.net_trades} currency={currency} />
                    <DataRow 
                        label="Capital Gains" 
                        value={breakdown.invested.capital_gains} 
                        currency={currency} 
                        isBold 
                        valueClassName={breakdown.invested.capital_gains >= 0 ? "text-emerald-600" : "text-red-600"}
                    />
                    <div className="pt-2 mt-2 border-t border-gray-100">
                        <DataRow label="Ending Invested" value={breakdown.invested.ending_value} currency={currency} isBold valueClassName="text-lg" />
                    </div>
                     <div className="mt-4 bg-slate-50 rounded-lg p-3 border border-slate-100">
                       <h5 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                           <DollarSign className="w-3 h-3"/> Cash Impact
                       </h5>
                       <DataRow label="Dividends & Interest" value={breakdown.income_expenses.dividends + breakdown.income_expenses.interest} currency={currency} valueClassName="text-emerald-600" />
                       <DataRow label="Fees & Taxes" value={(breakdown.income_expenses.fees + breakdown.income_expenses.taxes) * -1} currency={currency} valueClassName="text-red-500" />
                     </div>
                 </div>
             ) : (
                  <div className="space-y-1">
                    <DataRow label="Beginning Value" value={breakdown.beginning_value} currency={currency} />
                    <DataRow label="Net External Flows" value={breakdown.cash_flows.net_external} currency={currency} />
                    <DataRow label="Income (Divs/Interest)" value={(breakdown.income_expenses?.dividends || 0) + (breakdown.income_expenses?.interest || 0)} currency={currency} />
                    <DataRow label="Fees & Taxes" value={((breakdown.income_expenses?.fees || 0) + (breakdown.income_expenses?.taxes || 0)) * -1} currency={currency} />
                    <DataRow label="Capital Gains" value={breakdown.pnl?.total_pnl_ex_flows || 0} currency={currency} isBold />
                    <div className="pt-2 mt-2 border-t border-gray-100">
                        <DataRow label="Ending Value" value={breakdown.ending_value} currency={currency} isBold />
                    </div>
                 </div>
             )}
          </Card>

           {/* ITD Analysis (Always shown as reference) */}
           <Card className="border-l-4 border-indigo-500 pl-5">
             <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                Inception Analysis (Invested)
             </h4>
              {itd.invested ? (
                 <div className="space-y-1">
                    <DataRow label="Beginning Invested" value={0} currency={currency} className="opacity-75" />
                    <DataRow label="Total Net Invested" value={itd.invested.net_trades} currency={currency} />
                    <DataRow 
                        label="Total Capital Gains" 
                        value={itd.invested.capital_gains} 
                        currency={currency} 
                        isBold 
                        valueClassName={itd.invested.capital_gains >= 0 ? "text-emerald-600" : "text-red-600"}
                    />
                    <div className="pt-2 mt-2 border-t border-gray-100">
                        <DataRow label="Current Invested" value={itd.invested.ending_value} currency={currency} isBold valueClassName="text-lg" />
                    </div>
                     <div className="mt-4 bg-slate-50 rounded-lg p-3 border border-slate-100">
                       <h5 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                           <DollarSign className="w-3 h-3"/> Total Income
                       </h5>
                       <DataRow label="Dividends & Interest" value={itd.income_expenses.dividends + itd.income_expenses.interest} currency={currency} valueClassName="text-emerald-600" />
                       <DataRow label="Fees & Taxes" value={(itd.income_expenses.fees + itd.income_expenses.taxes) * -1} currency={currency} valueClassName="text-red-500" />
                     </div>
                 </div>
              ) : (
                 <div className="space-y-1">
                    <DataRow label="Total Invested Cash" value={itd.cash_flows.net_external} currency={currency} />
                    <DataRow label="Total Dividends Received" value={itd.income_expenses?.dividends || 0} currency={currency} />
                    <DataRow label="Total Fees Paid" value={itd.income_expenses?.fees || 0} currency={currency} />
                    <DataRow label="Realized Gains" value={itd.pnl?.realized_gains_approx || 0} currency={currency} />
                    <DataRow label="Unrealized Gains" value={itd.pnl?.unrealized_gains_residual || 0} currency={currency} isBold />
                     <div className="pt-2 mt-2 border-t border-gray-100">
                        <DataRow label="Current Value" value={itd.ending_value} currency={currency} isBold />
                    </div>
                 </div>
              )}
          </Card>
        </div>
      </>
    )}
  </div>
);
}
