import { buyStock, sellStock } from "@/services/api/portfolio";
import { useState } from "react";


export default function TradePanel({ companyId, currentPrice }: { companyId: number, currentPrice: number }) {
  const [qty, setQty] = useState(1);

  const handleTrade = async (type: "buy" | "sell") => {
    try {
      if (type === "buy") await buyStock(companyId, qty, currentPrice);
      else await sellStock(companyId, qty, currentPrice);
      alert(`${type} successful`);
    } catch (err) {
      alert(`${type} failed`);
    }
  };

  return (
    <div className="p-4 border rounded bg-white shadow-md space-y-4">
      <h3 className="font-semibold">Buy / Sell</h3>
      <input
        type="number"
        min="1"
        value={qty}
        onChange={(e) => setQty(Number(e.target.value))}
        className="border p-1 w-full"
      />
      <div className="flex gap-2">
        <button onClick={() => handleTrade("buy")} className="px-4 py-1 bg-green-500 text-white rounded">Buy</button>
        <button onClick={() => handleTrade("sell")} className="px-4 py-1 bg-red-500 text-white rounded">Sell</button>
      </div>
    </div>
  );
}
