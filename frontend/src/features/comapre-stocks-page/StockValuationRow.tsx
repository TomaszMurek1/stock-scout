import { FC } from "react"
import ComparisonCard from "./ComparisonCard"
import { TwoLine } from "./mini-charts"
import { ChartPieIcon, TagIcon } from "@heroicons/react/24/solid"

interface Props {
    tickerA: string
    tickerB: string
    stockData: Array<any>
    lastA: number | null
    lastB: number | null
    pfcfA: number | null
    pfcfB: number | null
}

const StockValuationRow: FC<Props> = ({
    tickerA, tickerB, stockData, lastA, lastB, pfcfA, pfcfB
}) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock */}
        <ComparisonCard title="Stock" subtitle="Past 5 yrs" icon={<ChartPieIcon className="h-4 w-4" />}>
            <div className="relative w-full h-full">
                <TwoLine
                    data={stockData}
                    tooltipFormatter={v => v !== null ? `${v.toFixed(1)}%` : "--"}
                    yAxisFormatter={v => `${v}%`}
                    autoYAxisDomain
                    xAxisFormatter={String}
                    labelA={tickerA}
                    labelB={tickerB}
                />
                <div className="absolute inset-0 flex flex-col items-end justify-between p-4 pointer-events-none">
                    <div className="badge--dark">
                        {lastA !== null ? `${lastA >= 0 ? "+" : ""}${lastA.toFixed(0)}%` : "--"}
                    </div>
                    <div className="badge--light">
                        {lastB !== null ? `${lastB >= 0 ? "+" : ""}${lastB.toFixed(0)}%` : "--"}
                    </div>
                </div>
            </div>
        </ComparisonCard>

        {/* Valuation */}
        <ComparisonCard title="Valuation" subtitle="P/FCF (fwd)" icon={<TagIcon className="h-4 w-4" />}>
            <div className="flex flex-col items-center justify-center h-full">
                <div className="flex gap-8 text-4xl font-bold">
                    <span>{pfcfA !== null ? `${pfcfA.toFixed(1)}x` : `--`}</span>
                    <span> {pfcfB !== null ? `${pfcfB.toFixed(1)}x` : `--`}</span>
                </div>
                <p className="text-gray-500 italic mt-2">
                    Val history not in API
                </p>
            </div>
        </ComparisonCard>
    </div>
);

export default StockValuationRow;
