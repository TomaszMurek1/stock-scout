import { FC } from "react"
import {
    HeartIcon,
    QuestionMarkCircleIcon,
    PaperAirplaneIcon,
} from "@heroicons/react/24/solid"

export const StockCompareFooter: FC = () => (
    <div className="flex justify-center items-center space-x-2 text-gray-600 text-sm pt-6">
        <HeartIcon className="h-4 w-4 text-red-500" />
        <QuestionMarkCircleIcon className="h-4 w-4 text-black" />
        <PaperAirplaneIcon className="h-4 w-4 text-black" />
        <span className="uppercase font-semibold tracking-wide">@INVESTINGVISUALS</span>
    </div>
);

