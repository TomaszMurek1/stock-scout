import { FC } from "react";
import { useParams } from "react-router-dom";
import ComparisonCard from "./ComparisonCard";
import { useCompareData } from "./useCompareData"; // Assuming this hook fetches data
import { TwoBars, TwoLine, GroupedBar } from "./mini-charts"; // Import chart components
import LoadingScreen from "../shared/loading-screen";
import ErrorScreen from "../shared/error-screen";
import { ReactNode } from "react";

// Import Heroicons
import {
    CurrencyDollarIcon,
    SparklesIcon, // Used for Dilution - abstract, similar visual feel
    ChartPieIcon, // For Stock performance
    TagIcon, // For Valuation
    ScaleIcon, // For Balance Sheet
    ChartBarIcon, // For Margins
    CheckCircleIcon, // For Return on Capital
    HeartIcon, PaperAirplaneIcon, QuestionMarkCircleIcon // For footer - abstract shapes
} from '@heroicons/react/24/solid'; // Using solid icons for visibility

// Helper to map backend data to recharts format {label: string, a: number, b: number | null}
// Handles period (number or string) and date (string) keys
const mergeTimeSeries = (a: any[] = [], b: any[] = [], periodKey = 'period', valueKey = 'value'): { label: string; a: number | null; b: number | null }[] => {
    // Ensure we handle empty arrays or null data gracefully
    const mapA = Object.fromEntries(a.map((x: any) => [String(x[periodKey]), x[valueKey]]));
    const mapB = Object.fromEntries(b.map((x: any) => [String(x[periodKey]), x[valueKey]]));

    // Collect all unique periods/dates from both datasets
    const periods = Array.from(new Set([...Object.keys(mapA), ...Object.keys(mapB)])).sort((p1, p2) => {
        // Custom sort for years and 'LTM' or dates
        if (p1 === 'LTM') return 1; // Always last
        if (p2 === 'LTM') return -1;
        // Attempt numeric sort for years
        const numP1 = parseInt(p1);
        const numP2 = parseInt(p2);
        if (!isNaN(numP1) && !isNaN(numP2)) return numP1 - numP2;
        // Fallback to string comparison for dates or other strings
        return p1.localeCompare(p2);
    });

    return periods.map((p) => ({
        label: p,
        a: mapA[p] ?? null,
        b: mapB[p] ?? null
    }));
};

// Helper to format date strings to years or specific format if needed
const formatDateLabel = (dateString: string): string => {
    // Check if it looks like a full date string
    if (dateString.includes('-') && dateString.split('-').length === 3) {
        // Attempt to parse date string
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            // Format to YYYY for annual data, maybe simpler for frequent data?
            // Based on the image, stock chart X-axis just shows years.
            // Let's simplify to year if it's a date string
            return date.getFullYear().toString();
        }
    }
    // Otherwise, assume it's already a year or LTM or similar
    return dateString;
};

// ... (imports and mergeTimeSeries, formatDateLabel helpers remain the same) ...

export const StockCompare: FC = () => {
    const { tickerA, tickerB } = useParams<"tickerA" | "tickerB">();

    const { data, isLoading, error } = useCompareData(tickerA!, tickerB!);

    // ... (mockData for demonstration if needed) ...

    if (isLoading) return <LoadingScreen />;
    if (error || !data) return <ErrorScreen error={error as Error} />;

    const { a, b, as_of } = data;

    // --- Data Preparation ---
    const revenueData = mergeTimeSeries(a.revenue_growth, b.revenue_growth);
    const dilutionData = mergeTimeSeries(a.dilution, b.dilution);
    const fcfGrowthData = mergeTimeSeries(a.fcf_growth, b.fcf_growth);

    const aPriceData = a.price_performance?.filter((d: any) => d.value !== null) || [];
    const bPriceData = b.price_performance?.filter((d: any) => d.value !== null) || [];
    const stockData = mergeTimeSeries(aPriceData, bPriceData, 'date', 'value');

    const lastAStockValue = aPriceData.length > 0 ? aPriceData[aPriceData.length - 1].value : null;
    const lastBStockValue = bPriceData.length > 0 ? bPriceData[bPriceData.length - 1].value : null;

    const debtEquityData = mergeTimeSeries(a.debt_equity, b.debt_equity);

    const marginsData = [
        (a.margins?.gross !== null || b.margins?.gross !== null) ?
            { category: 'Gross margin', a: a.margins?.gross ?? null, b: b.margins?.gross ?? null } : null,
        (a.margins?.fcf !== null || b.margins?.fcf !== null) ?
            { category: 'FCF margin', a: a.margins?.fcf ?? null, b: b.margins?.fcf ?? null } : null,
    ].filter(item => item !== null);

    const returnOnCapitalData = mergeTimeSeries(a.return_on_capital, b.return_on_capital);

    // Determine the latest period/year from the available data for the header, or use a default
    const allPeriods = [
        ...revenueData.map(d => d.label),
        ...dilutionData.map(d => d.label),
        ...fcfGrowthData.map(d => d.label),
        // Stock data dates might be too granular, maybe skip for header year
        // ...stockData.map(d => d.label),
        ...debtEquityData.map(d => d.label),
        // Margins are LTM, not yearly series
        ...returnOnCapitalData.map(d => d.label),
    ].filter(label => label !== 'LTM').sort((p1, p2) => parseInt(String(p2)) - parseInt(String(p1))); // Sort descending by year

    const latestYear = allPeriods.length > 0 ? allPeriods[0] : 'N/A';
    const headerDate = latestYear !== 'N/A' ? `${latestYear}` : 'Loading Date...'; // Can customize this

    return (
        // Background color
        <div className="min-h-screen bg-[#f8f4ef] text-gray-800 font-sans">
            <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-6">
                {/* Header ------------------------------------------------------------ */}
                <div className="flex flex-col items-center justify-center">
                    <div className="flex items-center gap-6 mb-2">
                        {/* Generic Circle Placeholder for Logo A */}
                        <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                            <QuestionMarkCircleIcon className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-4xl font-serif text-gray-900">{a.ticker}</h1>
                        <span className="text-2xl font-normal font-sans text-gray-600">vs</span>
                        <h1 className="text-4xl font-serif text-gray-900">{b.ticker}</h1>
                        {/* Generic Circle Placeholder for Logo B */}
                        <div className="w-10 h-10 bg-[#f4a742] rounded-full flex items-center justify-center flex-shrink-0">
                            <QuestionMarkCircleIcon className="h-6 w-6 text-black" />
                        </div>
                    </div>
                    <div className="bg-black text-white text-xs px-3 py-1 rounded-full font-mono tracking-wide">
                        {/* Use a specific quarter/year if known, or derive from data */}
                        Q4 {latestYear} {/* Example, replace with specific quarter if backend provides */}
                    </div>
                </div>

                {/* Grid -------------------------------------------------------------- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Revenue Card */}
                    <ComparisonCard title="Revenue" subtitle="Growth rate in percentages" icon={<CurrencyDollarIcon className="h-4 w-4" />}>
                        <TwoLine
                            data={revenueData}
                            tooltipFormatter={(v: number | null) => v !== null ? v.toFixed(0) + "%" : '--'}
                            yAxisDomain={[0, 100]}
                            hideXAxis={false}
                            xAxisFormatter={(label) => String(label)}
                            labelA={a.ticker} // Pass tickers
                            labelB={b.ticker}
                        />
                    </ComparisonCard>

                    {/* Dilution Card */}
                    <ComparisonCard title="Dilution" subtitle="Stock based comp. as % of revenue" icon={<SparklesIcon className="h-4 w-4" />}>
                        <TwoBars
                            data={dilutionData}
                            yAxisDomain={[0, 120]}
                            tooltipFormatter={(v: number | null) => v !== null ? v.toFixed(0) + "%" : '--'}
                            hideXAxis={false}
                            xAxisFormatter={(label) => String(label)}
                            labelA={a.ticker} // Pass tickers
                            labelB={b.ticker}
                        />
                    </ComparisonCard>

                    {/* Free cash flow Card */}
                    <ComparisonCard title="Free cash flow" subtitle="Growth rate in percentages" icon={<CurrencyDollarIcon className="h-4 w-4" />}>
                        <TwoLine
                            data={fcfGrowthData}
                            yAxisDomain={[-100, 800]} // Adjusted domain for growth percentages
                            tooltipFormatter={(v: number | null) => v !== null ? v.toFixed(0) + "%" : '--'} // Format as percentage
                            hideXAxis={false}
                            xAxisFormatter={(label) => String(label)}
                            showZeroLine={true}
                            labelA={a.ticker} // Pass tickers
                            labelB={b.ticker}
                        />
                    </ComparisonCard>
                </div>

                {/* Row 2 - Stock (1 col) and Valuation (2 cols) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Stock Card - spans 1 col */}
                    <div className="lg:col-span-1 h-full">
                        <ComparisonCard title="Stock" subtitle="Past 5 years" icon={<ChartPieIcon className="h-4 w-4" />}>
                            <div className="relative w-full h-full flex flex-col justify-center">
                                <TwoLine
                                    data={stockData}
                                    // Adjusted Y domain based on your sample data (max is ~424%)
                                    yAxisDomain={[-100, 500]} // Set a reasonable upper limit based on observed data
                                    yAxisFormatter={(v: number) => v !== null ? v.toFixed(0) + "%" : '--'}
                                    hideYAxis={false}
                                    hideXAxis={false}
                                    showGridY={true}
                                    tooltipFormatter={(v: number | null) => v !== null ? v.toFixed(1) + "%" : '--'}
                                    // Use a formatter that extracts year or keeps short format if needed
                                    xAxisFormatter={(label: string) => {
                                        try {
                                            const date = new Date(label);
                                            if (!isNaN(date.getTime())) {
                                                // Format to 'YYYY' for simplicity on axis if it's a full date
                                                return date.getFullYear().toString();
                                            }
                                        } catch (e) {
                                            // Ignore parsing errors, treat as is
                                        }
                                        return label; // Keep original label if not a parsable date
                                    }}
                                    labelA={a.ticker} // Pass tickers
                                    labelB={b.ticker}
                                />
                                {/* Annotations - Absolute positioning */}
                                <div className="absolute inset-0 flex flex-col items-end justify-between p-4 pointer-events-none">
                                    {/* A % Change */}
                                    <div className="bg-black text-white text-xs font-bold rounded-full px-2 py-1 self-end mt-2">
                                        {lastAStockValue !== null ? (lastAStockValue >= 0 ? '+' : '') + lastAStockValue.toFixed(0) + "%" : '--'}
                                    </div>
                                    {/* B % Change */}
                                    <div className="bg-[#f4a742] text-black text-xs font-bold rounded-full px-2 py-1 self-end mb-2">
                                        {lastBStockValue !== null ? (lastBStockValue >= 0 ? '+' : '') + lastBStockValue.toFixed(0) + "%" : '--'}
                                    </div>
                                </div>
                            </div>
                        </ComparisonCard>
                    </div>

                    {/* Valuation Card - spans 2 cols */}
                    <div className="lg:col-span-2 h-full">
                        <ComparisonCard title="Valuation" subtitle="Price to free cash flow (forward looking)" icon={<TagIcon className="h-4 w-4" />}>
                            <div className="flex flex-col w-full h-full justify-center">
                                <div className="flex justify-around text-4xl font-bold py-4 flex-shrink-0">
                                    <span className="text-black">{a.valuation?.pfcf !== null ? a.valuation.pfcf.toFixed(1) + "x" : "--"}</span>
                                    <span className="text-[#f4a742]">{b.valuation?.pfcf !== null ? b.valuation.pfcf.toFixed(1) + "x" : "--"}</span>
                                </div>
                                <div className="flex-grow flex items-center justify-center text-gray-500 text-sm italic">
                                    Valuation history chart data not available in provided backend response.
                                </div>
                            </div>
                        </ComparisonCard>
                    </div>
                </div>

                {/* Row 3 - 3 columns */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Balance sheet Card */}
                    <ComparisonCard title="Balance sheet" subtitle="Debt to equity ratio (lower is better)" icon={<ScaleIcon className="h-4 w-4" />}>
                        <TwoBars
                            data={debtEquityData}
                            // Adjusted domain based on your sample data (max is ~0.4)
                            yAxisDomain={[0, 1]} // Set a reasonable upper limit for ratios like this
                            tooltipFormatter={(v: number | null) => v !== null ? v.toFixed(2) : '--'}
                            hideXAxis={false}
                            xAxisFormatter={(label) => String(label)}
                            labelA={a.ticker} // Pass tickers
                            labelB={b.ticker}
                        />
                    </ComparisonCard>

                    {/* Margins Card */}
                    <ComparisonCard title="Margins" subtitle="Last twelve months" icon={<ChartBarIcon className="h-4 w-4" />}>
                        {marginsData.length > 0 ? (
                            <GroupedBar
                                data={marginsData}
                                categoryKey="category"
                                valueKeyA="a"
                                valueKeyB="b"
                                labelA={a.ticker} // Pass tickers
                                labelB={b.ticker}
                                yAxisDomain={[0, 100]} // Assuming margins are %
                                tooltipFormatter={(v: number | null) => v !== null ? v.toFixed(1) + "%" : '--'}
                                xAxisFormatter={(label: string) => label.replace(' ', '\n')} // Line break for labels
                            />
                        ) : (
                            <div className="flex-grow flex items-center justify-center text-gray-500 text-sm italic">
                                Margins data not available
                            </div>
                        )}
                    </ComparisonCard>

                    {/* Return on capital Card */}
                    <ComparisonCard title="Return on capital" subtitle="In percentages" icon={<CheckCircleIcon className="h-4 w-4" />}>
                        <TwoBars
                            data={returnOnCapitalData}
                            // Adjusted domain based on your sample data (range ~-28 to ~221)
                            yAxisDomain={[-50, 250]} // Set reasonable bounds
                            tooltipFormatter={(v: number | null) => v !== null ? v.toFixed(1) + "%" : '--'}
                            hideXAxis={false}
                            xAxisFormatter={(label) => String(label)}
                            showZeroLine={true}
                            labelA={a.ticker} // Pass tickers
                            labelB={b.ticker}
                        />
                    </ComparisonCard>
                </div>

                {/* Footer ------------------------------------------------------------ */}
                <div className="flex justify-center items-center space-x-2 text-gray-600 text-sm pt-6">
                    <HeartIcon className="h-4 w-4 text-red-500" />
                    <QuestionMarkCircleIcon className="h-4 w-4 text-black" /> {/* Using QuestionMarkCircleIcon for the black circle placeholder */}
                    <PaperAirplaneIcon className="h-4 w-4 text-black" />
                    <span className="uppercase font-semibold tracking-wide">@INVESTINGVISUALS</span>
                </div>

            </div>
        </div>
    );
};

export default StockCompare;