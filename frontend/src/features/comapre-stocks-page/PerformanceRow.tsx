import { FC } from "react"
import ComparisonCard from "./ComparisonCard"
import { TwoLine, TwoBars } from "./mini-charts"
import { CurrencyDollarIcon, SparklesIcon } from "@heroicons/react/24/solid"

interface Props {
    tickerA: string
    tickerB: string
    revenueData: Array<any>
    dilutionData: Array<any>
    fcfData: Array<any>
}

export const PerformanceRow: FC<Props> = ({
    tickerA, tickerB, revenueData, dilutionData, fcfData
}) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ComparisonCard title="Revenue" subtitle="Growth %" icon={<CurrencyDollarIcon className="h-4 w-4" />}>
            <TwoLine
                data={revenueData}
                tooltipFormatter={v => v !== null ? `${v.toFixed(0)}%` : "--"}
                autoYAxisDomain
                xAxisFormatter={String}
                labelA={tickerA}
                labelB={tickerB}
            />
        </ComparisonCard>

        <ComparisonCard title="Dilution" subtitle="SBComp % of rev" icon={<SparklesIcon className="h-4 w-4" />}>
            <TwoBars
                data={dilutionData}
                tooltipFormatter={v => v !== null ? `${v.toFixed(0)}%` : "--"}
                autoYAxisDomain
                xAxisFormatter={String}
                labelA={tickerA}
                labelB={tickerB}
            />
        </ComparisonCard>

        <ComparisonCard title="Free cash flow" subtitle="Growth %" icon={<CurrencyDollarIcon className="h-4 w-4" />}>
            <TwoLine
                data={fcfData}
                tooltipFormatter={v => v !== null ? `${v.toFixed(0)}%` : "--"}
                autoYAxisDomain
                showZeroLine
                xAxisFormatter={String}
                labelA={tickerA}
                labelB={tickerB}
            />
        </ComparisonCard>
    </div>
);
