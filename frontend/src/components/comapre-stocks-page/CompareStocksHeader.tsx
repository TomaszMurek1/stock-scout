import { FC } from "react"
import { QuestionMarkCircleIcon } from "@heroicons/react/24/solid"

interface Props {
    tickerA: string
    tickerB: string
    latestYear: string
}

export const CompareStocksHeader: FC<Props> = ({ tickerA, tickerB, latestYear }) => (
    <div className="flex flex-col items-center">
        <div className="flex items-center gap-6 mb-2">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                <QuestionMarkCircleIcon className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-4xl font-serif">{tickerA}</h1>
            <span className="text-2xl">vs</span>
            <h1 className="text-4xl font-serif">{tickerB}</h1>
            <div className="w-10 h-10 bg-[#f4a742] rounded-full flex items-center justify-center">
                <QuestionMarkCircleIcon className="h-6 w-6 text-black" />
            </div>
        </div>
        <div className="bg-black text-white text-xs px-3 py-1 rounded-full font-mono tracking-wide">
            Q4 {latestYear}
        </div>
    </div>
);


