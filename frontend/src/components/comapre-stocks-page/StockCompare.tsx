import { FC } from "react";
import { useParams } from "react-router-dom";
import ComparisonCard from "./ComparisonCard";
import { useCompareData } from "./useCompareData";
import { TwoBars, TwoLine } from "./mini-charts";
import LoadingScreen from "../shared/loading-screen";
import ErrorScreen from "../shared/error-screen";

type SeriesPoint = { label: string; a: number | null; b: number | null };

const merge = (a: any[], b: any[]): SeriesPoint[] => {
    // convert [{period,value}] to quick lookup maps
    const mapA = Object.fromEntries(a.map((x: any) => [x.period, x.value]));
    const mapB = Object.fromEntries(b.map((x: any) => [x.period, x.value]));
    const periods = Array.from(new Set([...Object.keys(mapA), ...Object.keys(mapB)])).sort();
    return periods.map((p) => ({ label: p, a: mapA[p] ?? null, b: mapB[p] ?? null }));
};

export const StockCompare: FC = () => {
    const { tickerA, tickerB } = useParams<"tickerA" | "tickerB">();

    const { data, isLoading, error } = useCompareData(tickerA!, tickerB!);

    if (isLoading) return <LoadingScreen />;
    if (error || !data) return <ErrorScreen error={error as Error} />;

    const { a, b } = data;

    return (
        <div className="min-h-screen bg-gray-300">
            <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-6">
                {/* Header ------------------------------------------------------------ */}
                <div className="flex justify-center items-center gap-6">
                    <h1 className="text-3xl font-bold bg-white px-6 py-2 rounded shadow">
                        {a.ticker} <span className="font-normal">vs</span> {b.ticker}
                    </h1>
                </div>

                {/* Grid -------------------------------------------------------------- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* row 1 */}
                    <ComparisonCard title="Revenue growth">
                        <TwoLine data={merge(a.revenue_growth, b.revenue_growth)} />
                    </ComparisonCard>

                    <ComparisonCard title="Free-cash-flow growth">
                        <TwoLine data={merge(a.fcf_growth, b.fcf_growth)} />
                    </ComparisonCard>

                    <ComparisonCard title="Dilution (shares YoY)">
                        <TwoBars data={merge(a.dilution, b.dilution)} />
                    </ComparisonCard>

                    {/* row 2 */}
                    <ComparisonCard title="Price performance (5 yrs)">
                        <TwoLine
                            data={merge(
                                a.price_performance.map((d: any) => ({
                                    period: d.date,
                                    value: d.value,
                                })),
                                b.price_performance.map((d: any) => ({
                                    period: d.date,
                                    value: d.value,
                                }))
                            )}
                        />
                    </ComparisonCard>

                    <ComparisonCard title="Valuation (P/FCF)">
                        <div className="flex justify-around text-4xl font-semibold py-4">
                            <span>{a.valuation.pfcf?.toFixed(0) ?? "--"}</span>
                            <span>{b.valuation.pfcf?.toFixed(0) ?? "--"}</span>
                        </div>
                    </ComparisonCard>

                    <ComparisonCard title="Debt / equity proxy">
                        <TwoBars data={merge(a.debt_equity, b.debt_equity)} />
                    </ComparisonCard>

                    {/* row 3 */}
                    <ComparisonCard title="Margins (LTM)">
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                                <p className="text-xs">Gross</p>
                                <p className="text-lg font-bold">
                                    {a.margins.gross?.toFixed(1) ?? "--"}%
                                </p>
                            </div>
                            <div>
                                <p className="text-xs">Gross</p>
                                <p className="text-lg font-bold">
                                    {b.margins.gross?.toFixed(1) ?? "--"}%
                                </p>
                            </div>
                            <div>
                                <p className="text-xs">FCF</p>
                                <p className="text-lg font-bold">
                                    {a.margins.fcf?.toFixed(1) ?? "--"}%
                                </p>
                            </div>
                            <div>
                                <p className="text-xs">FCF</p>
                                <p className="text-lg font-bold">
                                    {b.margins.fcf?.toFixed(1) ?? "--"}%
                                </p>
                            </div>
                        </div>
                    </ComparisonCard>

                    <ComparisonCard title="Return on capital">
                        <TwoBars data={merge(a.return_on_capital, b.return_on_capital)} />
                    </ComparisonCard>
                </div>
            </div>
        </div>
    );
};

export default StockCompare;
