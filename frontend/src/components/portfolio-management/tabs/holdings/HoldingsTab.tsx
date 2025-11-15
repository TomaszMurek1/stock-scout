"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiHolding } from "../../types";

interface HoldingsTabProps {
  holdings: ApiHolding[];
  onRemove: (id: string) => void;
}

export default function HoldingsTab({ holdings, onRemove }: HoldingsTabProps) {
  console.log("byHolding", holdings);
  if (holdings.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No stocks in your portfolio. Add some stocks to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Symbol
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Shares
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Invested
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Current Value
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Gain/Loss
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {holdings.map((holding) => {
            const {
              ticker,
              shares,
              instrument_ccy,
              average_cost_instrument_ccy,
              average_cost_portfolio_ccy,
              last_price,
              fx_rate_to_portfolio_ccy,
            } = holding;

            const investedValueInstrumentCcy = shares * average_cost_instrument_ccy;
            const investedValuePortfolioCcy = shares * average_cost_portfolio_ccy;
            const currentValueInstrumentCcy = shares * last_price;
            const currentValuePortfolioCcy = shares * last_price * fx_rate_to_portfolio_ccy;
            const gainLossInstrumentCcy = currentValueInstrumentCcy - investedValueInstrumentCcy;
            const gainLossPortfolioCcy = currentValuePortfolioCcy - investedValuePortfolioCcy;
            const isPositive = gainLossInstrumentCcy >= 0;
            //TODO: calculate investedValueInHolding, currentValueInHolding in both currencies
            return (
              <tr key={ticker}>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{ticker}</td>
                <td className="px-6 py-4 whitespace-nowrap">{shares}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {investedValuePortfolioCcy.toLocaleString(undefined, {
                    style: "currency",
                    currency: "PLN",
                  })}{" "}
                  <br />(
                  {investedValueInstrumentCcy.toLocaleString(undefined, {
                    style: "currency",
                    currency: instrument_ccy,
                  })}
                  )
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {currentValuePortfolioCcy.toLocaleString(undefined, {
                    style: "currency",
                    currency: "PLN",
                  })}{" "}
                  <br />(
                  {currentValueInstrumentCcy.toLocaleString(undefined, {
                    style: "currency",
                    currency: instrument_ccy,
                  })}
                  )
                </td>
                <td
                  className={`px-6 py-4 whitespace-nowrap ${isPositive ? "text-green-600" : "text-red-600"}`}
                >
                  {gainLossPortfolioCcy.toLocaleString(undefined, {
                    style: "currency",
                    currency: "PLN",
                  })}{" "}
                  <br />(
                  {gainLossInstrumentCcy.toLocaleString(undefined, {
                    style: "currency",
                    currency: instrument_ccy,
                  })}
                  )
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(ticker)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
