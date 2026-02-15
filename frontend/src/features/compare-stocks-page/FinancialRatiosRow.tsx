import { FC } from "react"
import ComparisonCard from "./ComparisonCard"
import { TwoBars, GroupedBar } from "./mini-charts"
import {
    ScaleIcon,
    ChartBarIcon,
    CheckCircleIcon
} from "@heroicons/react/24/solid"

interface Props {
    tickerA: string
    tickerB: string
    debtEquity: Array<any>
    margins: Array<{ category: string; a: number; b: number }>
    roc: Array<any>
}

export const FinancialRatiosRow: FC<Props> = ({
    tickerA, tickerB, debtEquity, margins, roc
}) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ComparisonCard title="Debt / Equity" subtitle="Lower is better" icon={<ScaleIcon className="h-4 w-4" />}>
            <TwoBars
                data={debtEquity}
                tooltipFormatter={v => v !== null ? v.toFixed(2) : "--"}

                xAxisFormatter={String}
                labelA={tickerA}
                labelB={tickerB}
            />
        </ComparisonCard>

        <ComparisonCard title="Margins (LTM)" subtitle="" icon={<ChartBarIcon className="h-4 w-4" />}>
            {margins.length
                ? <GroupedBar
                    data={margins}
                    categoryKey="category"
                    valueKeyA="a"
                    valueKeyB="b"
                    labelA={tickerA}
                    labelB={tickerB}
                    autoYAxisDomain
                    tooltipFormatter={v => v !== null ? `${v.toFixed(1)}%` : "--"}
                    xAxisFormatter={l => l.replace(" ", "\n")}
                />
                : <p className="italic text-gray-500">No margins data</p>}
        </ComparisonCard>

        <ComparisonCard title="Return on capital" subtitle="%" icon={<CheckCircleIcon className="h-4 w-4" />}>
            <TwoBars
                data={roc}
                tooltipFormatter={v => v !== null ? `${v.toFixed(1)}%` : "--"}
                showZeroLine

                xAxisFormatter={String}
                labelA={tickerA}
                labelB={tickerB}
            />
        </ComparisonCard>
    </div>
);
