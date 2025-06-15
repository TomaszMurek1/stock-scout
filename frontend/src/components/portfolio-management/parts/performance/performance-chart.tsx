import React, { useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { usePortfolioBaseData } from "../../hooks/usePortfolioBaseData";

// Utility: get list of dates between two
const getDateRange = (start: Date, end: Date) => {
    const arr = [];
    for (
        let dt = new Date(start);
        dt <= end;
        dt.setDate(dt.getDate() + 1)
    ) {
        arr.push(new Date(dt).toISOString().slice(0, 10));
    }
    return arr;
};

// Utility: get rate for date, fallback to previous if missing
function getRateOnDate(rates: { date: string, rate: number }[], date: string): number | null {
    if (!rates?.length) return null;
    let best = rates[0];
    for (const r of rates) {
        if (r.date <= date && r.date > best.date) best = r;
    }
    return best.rate;
}

// Utility: get price for date, fallback to previous if missing
function getPriceOnDate(prices: { date: string, close: number }[], date: string): number | null {
    if (!prices?.length) return null;
    let best = prices[0];
    for (const p of prices) {
        if (p.date <= date && p.date > best.date) best = p;
    }
    return best.close;
}

// Supported periods
const PERIODS = [
    { key: "all", label: "All Time" },
    { key: "ytd", label: "YTD" },
    { key: "1y", label: "1Y" },
    { key: "6m", label: "6M" },
    { key: "3m", label: "3M" },
    { key: "1m", label: "1M" },
    { key: "1w", label: "1W" }
];

// --- MAIN COMPONENT ---
export const Performance: React.FC = () => {
    // get data from Zustand (or as props)
    const {
        portfolio,
        transactions,
        currencyRates,
        priceHistory
    } = usePortfolioBaseData(); // adjust if you pass as props

    const [period, setPeriod] = useState("all");
    const portfolioCurrency = portfolio?.currency || "PLN";

    // --- MEMOIZED CALCULATION ---
    const { perfSeries, benchmarkSeries, dateRange } = useMemo(() => {
        if (!transactions?.length) return { perfSeries: [], benchmarkSeries: [], dateRange: [] };

        // sort transactions
        const txs = [...transactions].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        const firstDate = txs[0].timestamp.slice(0, 10);
        const lastDate = (new Date()).toISOString().slice(0, 10);

        const fullDates = getDateRange(new Date(firstDate), new Date(lastDate));

        // Map: companyId -> [{date, close, currency}]
        // Map: "USDPLN" -> [{date, rate}]
        // For each day, walk through transactions and build positions
        let positions: Record<string, number> = {};
        let cash: number = 0; // optional, you can extend to cash flows

        let txIdx = 0;
        const dailyValue: number[] = [];
        const dates: string[] = [];

        // for currency conversions: rates[USDPLN], rates[EURPLN], etc.
        function convert(val: number, from: string, to: string, date: string) {
            if (from === to) return val;
            const pair = from + to;
            const invPair = to + from;
            // direct pair
            debugger
            if (currencyRates[pair]) {
                const r = getRateOnDate(currencyRates[pair], date);
                return r ? val * r : val;
            }
            // inverse pair
            if (currencyRates[invPair]) {
                const r = getRateOnDate(currencyRates[invPair], date);
                return r ? val / r : val;
            }
            // fallback: no rate available, assume 1:1 (shouldn't happen)
            return val;
        }

        for (let d = 0; d < fullDates.length; ++d) {
            const date = fullDates[d];
            // apply all txs for today
            while (txIdx < txs.length && txs[txIdx].timestamp.slice(0, 10) <= date) {
                const tx = txs[txIdx];
                switch (tx.transaction_type) {
                    case "buy":
                        positions[tx.ticker] = (positions[tx.ticker] || 0) + Number(tx.shares);
                        // Cash is ignored unless you want to show cash drag
                        break;
                    case "sell":
                        positions[tx.ticker] = (positions[tx.ticker] || 0) - Number(tx.shares);
                        break;
                    // add dividends, deposits etc. as needed
                }
                txIdx++;
            }
            // For each position, get price for date, convert to portfolioCurrency
            let portfolioValue = 0;
            for (const companyId in positions) {
                const qty = positions[companyId];
                if (!qty) continue;
                const prices = priceHistory[companyId];
                const price = getPriceOnDate(prices, date);
                if (price === null) continue;
                // Find currency for this company (take from first price)
                const cc = prices?.[0]?.currency || portfolioCurrency;
                const priceInPortfolioCurrency = convert(price, cc, portfolioCurrency, date);
                portfolioValue += qty * priceInPortfolioCurrency;
            }
            dailyValue.push(portfolioValue);
            dates.push(date);
        }

        // Calculate performance % (relative to first non-zero value)
        let startIdx = dailyValue.findIndex((v) => v > 0);
        let initialValue = dailyValue[startIdx] || 1; // prevent div by 0
        const perfSeries = dailyValue.map((val, i) => ({
            date: dates[i],
            value: initialValue > 0 ? ((val - initialValue) / initialValue) * 100 : 0,
        }));

        // Dummy benchmark (e.g., linear +10% over period)
        const benchmarkSeries = perfSeries.map((pt, i, arr) => ({
            date: pt.date,
            value: (i / arr.length) * 10, // +10% over period
        }));

        return { perfSeries, benchmarkSeries, dateRange: dates };
    }, [transactions, priceHistory, currencyRates, portfolioCurrency]);

    // --- PERIOD FILTER ---
    const filterSeries = (series: { date: string, value: number }[]) => {
        if (!series.length) return [];
        const today = new Date();
        let startIdx = 0;
        switch (period) {
            case "ytd": {
                const ytd = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);
                startIdx = series.findIndex((pt) => pt.date >= ytd);
                break;
            }
            case "1y": {
                const oneY = new Date(today);
                oneY.setFullYear(today.getFullYear() - 1);
                const oneYStr = oneY.toISOString().slice(0, 10);
                startIdx = series.findIndex((pt) => pt.date >= oneYStr);
                break;
            }
            case "6m": {
                const sixM = new Date(today);
                sixM.setMonth(today.getMonth() - 6);
                const sixMStr = sixM.toISOString().slice(0, 10);
                startIdx = series.findIndex((pt) => pt.date >= sixMStr);
                break;
            }
            case "3m": {
                const threeM = new Date(today);
                threeM.setMonth(today.getMonth() - 3);
                const threeMStr = threeM.toISOString().slice(0, 10);
                startIdx = series.findIndex((pt) => pt.date >= threeMStr);
                break;
            }
            case "1m": {
                const oneM = new Date(today);
                oneM.setMonth(today.getMonth() - 1);
                const oneMStr = oneM.toISOString().slice(0, 10);
                startIdx = series.findIndex((pt) => pt.date >= oneMStr);
                break;
            }
            case "1w": {
                const oneW = new Date(today);
                oneW.setDate(today.getDate() - 7);
                const oneWStr = oneW.toISOString().slice(0, 10);
                startIdx = series.findIndex((pt) => pt.date >= oneWStr);
                break;
            }
            default:
                startIdx = 0;
        }
        if (startIdx < 0) startIdx = 0;
        return series.slice(startIdx);
    };

    const filteredPerf = filterSeries(perfSeries);
    const filteredBenchmark = filterSeries(benchmarkSeries);

    // --- ECHARTS OPTIONS ---
    const option = {
        title: {
            text: 'Portfolio Performance (%)',
            left: 'center',
        },
        tooltip: {
            trigger: 'axis',
            formatter: (params: any) => {
                return params.map((p: any) =>
                    `${p.seriesName}: ${p.value[1]?.toFixed(2)}%`
                ).join('<br/>');
            }
        },
        legend: {
            data: ['Portfolio', 'Benchmark'],
            top: 30,
        },
        xAxis: {
            type: 'category',
            data: filteredPerf.map(d => d.date),
        },
        yAxis: {
            type: 'value',
            axisLabel: { formatter: '{value} %' },
        },
        series: [
            {
                name: 'Portfolio',
                type: 'line',
                smooth: true,
                data: filteredPerf.map(d => [d.date, d.value]),
                emphasis: { focus: 'series' },
            },
            {
                name: 'Benchmark',
                type: 'line',
                smooth: true,
                data: filteredBenchmark.map(d => [d.date, d.value]),
                lineStyle: { type: 'dashed' },
                emphasis: { focus: 'series' },
            },
        ],
    };

    // --- RENDER ---
    return (
        <div className="bg-white rounded-xl shadow p-6">
            <div className="flex gap-2 mb-4">
                {PERIODS.map(p => (
                    <button
                        key={p.key}
                        onClick={() => setPeriod(p.key)}
                        className={`px-3 py-1 rounded ${period === p.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>
            <ReactECharts option={option} style={{ height: 400 }} />
        </div>
    );
};

export default Performance;