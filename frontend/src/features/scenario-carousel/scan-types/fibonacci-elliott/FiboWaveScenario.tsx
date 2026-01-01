import React from "react";
import { useParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, RefreshCw, Info } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { FiboWaveChartArea } from "./FiboWaveChartArea";
import { useFiboWaveScenario } from "./useFiboWaveScenario";

/**
 * Container component handling loading / error / no-data states,
 * plus header with refresh button and info popover.
 */
import { useAppStore, AppState } from "@/store/appStore";

/**
 * Container component handling loading / error / no-data states,
 * plus header with refresh button and info popover.
 */
export const FiboWaveScenario: React.FC = () => {
    const { ticker } = useParams<{ ticker: string }>();
    const pivotThreshold = useAppStore((state: AppState) => state.fibonacciElliott.scanParams?.pivotThreshold || 0.05);

    const { data, isLoading, isError, refresh, error } = useFiboWaveScenario(ticker, pivotThreshold);

    if (isLoading) return <LoadingState ticker={ticker} />;
    if (isError) return <ErrorState ticker={ticker} message={error?.message} />;
    if (!data) return <NoDataState ticker={ticker} />;

    return (
        <Card>
            <CardHeader className="flex justify-between items-center space-x-4">
                <div className="flex items-center gap-2">
                    <CardTitle>{ticker} – Elliott (Daily)</CardTitle>
                    <InfoPopover />
                </div>
                <Button variant="ghost" size="icon" onClick={refresh} aria-label="Refresh">
                    <RefreshCw className="h-5 w-5" />
                </Button>
            </CardHeader>
            <CardContent className="pt-2" style={{ height: '520px' }}>
                <FiboWaveChartArea data={data} />
                <p className="text-xs text-muted-foreground mt-2 text-right pr-4">
                    Kelly Fraction:{" "}
                    <span className="font-semibold text-foreground">
                        {(data.kelly_fraction * 100).toFixed(0)}%
                    </span>
                </p>
            </CardContent>
        </Card>
    );
};

const InfoPopover: React.FC = () => (
    <Popover>
        <PopoverTrigger asChild>
            <button aria-label="Chart info" className="p-0 hover:text-foreground">
                <Info className="h-4 w-4 text-muted-foreground" />
            </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 text-sm">
            <p className="font-semibold mb-2">Chart Guide</p>
            <ul className="list-disc list-inside space-y-1">
                <li><b>Blue dots</b>: Price Pivots (High/Low)</li>
                <li><b>Labels</b>: Elliott Wave Counts (e.g., 1-5, A-C)</li>
                <li><b>Dashed Lines</b>: Fibonacci Levels</li>
                <li><b>Grey Bars</b>: Daily Volume</li>
                <li><b>X-axis</b>: Sequential trading days with month ticks</li>
            </ul>
        </PopoverContent>
    </Popover>
);

const LoadingState = ({ ticker }: { ticker?: string }) => (
    <Card>
        <CardHeader>
            <CardTitle>{ticker} – Elliott Wave Analysis</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center p-8 text-muted-foreground min-h-[300px]">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading chart data…
        </CardContent>
    </Card>
);

const ErrorState = ({ ticker, message }: { ticker?: string; message?: string }) => (
    <Card>
        <CardHeader>
            <CardTitle>{ticker} – Elliott Wave Analysis</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-8 text-destructive min-h-[300px]">
            <AlertCircle className="h-6 w-6 mb-2" />
            <p className="font-semibold">Error Loading Data</p>
            <p className="text-sm text-center mt-1">
                Could not fetch analysis{ticker ? ` for ${ticker}` : ''}. {message}
            </p>
        </CardContent>
    </Card>
);

const NoDataState = ({ ticker }: { ticker?: string }) => (
    <Card>
        <CardHeader>
            <CardTitle>{ticker} – Elliott Wave Analysis</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-8 text-muted-foreground min-h-[300px]">
            <Info className="h-6 w-6 mb-2" />
            <p>No analysis data available{ticker ? ` for ${ticker}` : ''}.</p>
        </CardContent>
    </Card>
);