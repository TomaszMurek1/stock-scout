import {
    LineChart,
    Line,
    BarChart,
    Bar,
    Tooltip,
    ResponsiveContainer,
    XAxis,
    YAxis,
    CartesianGrid,
    ReferenceLine,
    Legend,
} from "recharts"
import type { FC } from "react"

// Add this helper function to calculate appropriate Y-axis domain
const calculateYAxisDomain = (
    data: any[],
    keys: string[],
    buffer = 1.2
): [number, number] => {
    let minValue = 0
    let maxValue = 0

    data.forEach(item =>
        keys.forEach(key => {
            const v = item[key]
            if (v != null) {
                if (v < minValue) minValue = v
                if (v > maxValue) maxValue = v
            }
        })
    )

    const absMax = Math.max(Math.abs(minValue), Math.abs(maxValue))

    if (absMax === 0) return [0, 10]

    // magnitude for rounding
    const magnitude = Math.pow(
        10,
        Math.floor(Math.log10(absMax * buffer))
    )
    // round up the max
    const precision = 2;
    const factor = Math.pow(10, precision);
    const niceMax = Math.round((Math.ceil((absMax * buffer) / magnitude) * magnitude) * factor) / factor;
    console.log("niceMax", niceMax)
    if (minValue < 0) {
        // buffer and then round *down* to the nearest magnitude
        const bufferedMin = minValue * buffer
        const niceMin =
            Math.floor(bufferedMin / magnitude) * magnitude
        return [niceMin, niceMax]
    }

    return [0, niceMax]
}

interface YearFilter {
    formatYear(dateStr: string): string
}

// Helper function to filter out duplicate years from X-axis labels
const filterDuplicateYears = (): YearFilter => {
    const years: { [key: string]: boolean } = {}
    return {
        formatYear: (dateStr: string) => {
            try {
                const year = new Date(dateStr).getFullYear().toString()
                if (!years[year]) {
                    years[year] = true
                    return year
                }
                return ""
            } catch {
                return dateStr
            }
        },
    }
}

// Custom Tooltip component for consistent styling
const CustomTooltip: FC<any> = ({ active, payload, label, formatter }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-2 border border-gray-300 rounded shadow text-xs">
                <p className="font-bold">{label}</p>
                {payload.map((pld: any, index: number) => {
                    // Skip null values in tooltip
                    if (pld.value === null || pld.value === undefined) return null
                    return (
                        <p key={index} style={{ color: pld.stroke || pld.fill }}>
                            {pld.name || pld.dataKey}: {formatter ? formatter(pld.value) : pld.value.toFixed(1)}
                        </p>
                    )
                })}
            </div>
        )
    }
    return null
}

interface ChartProps {
    data: any[]
    yAxisDomain?: [number, number]
    yAxisFormatter?: (value: number) => string
    xAxisFormatter?: (value: any) => string // Can be number or string periods
    tooltipFormatter?: (value: number | null) => string // Updated to handle null
    hideXAxis?: boolean
    hideYAxis?: boolean
    showGridY?: boolean
    showGridX?: boolean
    lineStrokeA?: string
    lineStrokeB?: string
    barFillA?: string
    barFillB?: string
    showLegend?: boolean
    showZeroLine?: boolean // Option to show a line at y=0
    labelA?: string // Label for company A (for tooltip)
    labelB?: string // Label for company B (for tooltip)
    autoYAxisDomain?: boolean // New prop to enable auto Y-axis domain calculation
}

export const TwoLine: FC<ChartProps> = ({
    data,
    yAxisDomain,
    yAxisFormatter,
    xAxisFormatter = (v: any) => String(v), // Default formatter converts to string
    tooltipFormatter = (v: number | null) => (v !== null ? v.toFixed(1) : "--"), // Default tooltip formatter
    hideXAxis = false,
    hideYAxis = false,
    showGridY = true,
    showGridX = true,
    lineStrokeA = "#000",
    lineStrokeB = "#f4a742",
    showZeroLine = false,
    labelA = "A", // Default labels
    labelB = "B",
    autoYAxisDomain = true,
}) => {
    // Filter data to check if series A or B has all null values
    const hasSeriesA = !data.every((item) => item.a === null || item.a === undefined)
    const hasSeriesB = !data.every((item) => item.b === null || item.b === undefined)

    // Calculate appropriate Y-axis domain if autoYAxisDomain is true
    const calculatedDomain = autoYAxisDomain ? calculateYAxisDomain(data, ["a", "b"]) : yAxisDomain

    // For stock chart, create a year filter to show only first occurrence
    const yearFilter = filterDuplicateYears()

    return (
        <ResponsiveContainer width="100%" height={260} className="max-w-2xl mx-auto">
            <LineChart data={data} margin={{ top: 5, right: 30, bottom: 5, left: 30 }}>
                {showGridY && <CartesianGrid stroke="#eee" vertical={false} />}
                {showGridX && <CartesianGrid stroke="#eee" horizontal={false} />}
                <XAxis
                    dataKey="label"
                    hide={hideXAxis}
                    tickFormatter={(label) => {
                        // If it looks like a date, use the year filter
                        if (typeof label === "string" && label.includes("-")) {
                            return yearFilter.formatYear(label)
                        }
                        return xAxisFormatter(label)
                    }}
                    axisLine={{ stroke: "#e0e0e0" }}
                    tickLine={false}
                    tick={{ fontSize: 10 }}
                    height={20}
                />
                <YAxis
                    hide={hideYAxis}
                    domain={calculatedDomain}
                    tickFormatter={yAxisFormatter}
                    axisLine={{ stroke: "#e0e0e0" }}
                    tickLine={false}
                    tick={{ fontSize: 10 }}
                    width={30}
                />
                {showZeroLine && <ReferenceLine y={0} stroke="#ccc" strokeDasharray="3 3" />}
                <Tooltip content={<CustomTooltip formatter={tooltipFormatter} />} />
                <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => <span style={{ color: value === labelA ? lineStrokeA : lineStrokeB }}>{value}</span>}
                />
                {hasSeriesA && (
                    <Line
                        dataKey="a"
                        stroke={lineStrokeA}
                        strokeWidth={2}
                        dot={false}
                        type="monotone"
                        name={labelA}
                        connectNulls={true}
                        isAnimationActive={false}
                    />
                )}
                {hasSeriesB && (
                    <Line
                        dataKey="b"
                        stroke={lineStrokeB}
                        strokeWidth={2}
                        dot={false}
                        type="monotone"
                        name={labelB}
                        connectNulls={true}
                        isAnimationActive={false}
                    />
                )}
            </LineChart>
        </ResponsiveContainer>
    )
}

export const TwoBars: FC<ChartProps> = ({
    data,
    yAxisDomain,
    yAxisFormatter,
    xAxisFormatter = (v: any) => String(v),
    tooltipFormatter = (v: number | null) => (v !== null ? v.toFixed(1) : "--"),
    hideXAxis = false,
    hideYAxis = false,
    showGridY = true,
    showGridX = true,
    barFillA = "#000",
    barFillB = "#f4a742",
    showZeroLine = false,
    labelA = "A",
    labelB = "B",
    autoYAxisDomain = true,
}) => {
    // Filter data to check if series A or B has all null values
    const hasSeriesA = !data.every((item) => item.a === null || item.a === undefined)
    const hasSeriesB = !data.every((item) => item.b === null || item.b === undefined)

    // Calculate appropriate Y-axis domain if autoYAxisDomain is true
    const calculatedDomain = autoYAxisDomain ? calculateYAxisDomain(data, ["a", "b"]) : yAxisDomain
    console.log("calculatedDomain", calculatedDomain)

    return (
        <ResponsiveContainer width="100%" height={260} className="max-w-2xl mx-auto">
            <BarChart data={data} margin={{ top: 5, right: 30, bottom: 5, left: 30 }}>
                {showGridY && <CartesianGrid stroke="#eee" vertical={false} />}
                {showGridX && <CartesianGrid stroke="#eee" horizontal={false} />}
                <XAxis
                    dataKey="label"
                    hide={hideXAxis}
                    tickFormatter={xAxisFormatter}
                    axisLine={{ stroke: "#e0e0e0" }}
                    tickLine={false}
                    tick={{ fontSize: 10 }}
                    height={20}
                />
                <YAxis
                    hide={hideYAxis}
                    domain={calculatedDomain}
                    tickFormatter={yAxisFormatter}
                    axisLine={{ stroke: "#e0e0e0" }}
                    tickLine={false}
                    tick={{ fontSize: 10 }}
                    width={30}
                />
                {showZeroLine && <ReferenceLine y={0} stroke="#ccc" strokeDasharray="3 3" />}
                <Tooltip content={<CustomTooltip formatter={tooltipFormatter} />} />
                <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => <span style={{ color: value === labelA ? barFillA : barFillB }}>{value}</span>}
                />
                {hasSeriesA && <Bar dataKey="a" fill={barFillA} radius={[4, 4, 0, 0]} name={labelA} />}
                {hasSeriesB && <Bar dataKey="b" fill={barFillB} radius={[4, 4, 0, 0]} name={labelB} />}
            </BarChart>
        </ResponsiveContainer>
    )
}

interface GroupedBarChartProps extends ChartProps {
    categoryKey: string // Key in data for the category label (e.g., 'category')
    valueKeyA: string // Key for company A's value (e.g., 'a')
    valueKeyB: string // Key for company B's value (e.g., 'b')
}

export const GroupedBar: FC<GroupedBarChartProps> = ({
    data,
    yAxisDomain,
    yAxisFormatter,
    xAxisFormatter = (v: any) => String(v),
    tooltipFormatter = (v: number | null) => (v !== null ? v.toFixed(1) : "--"),
    hideYAxis = true,
    showGridY = false,
    showGridX = false,
    barFillA = "#000",
    barFillB = "#f4a742",
    categoryKey,
    valueKeyA,
    valueKeyB,
    labelA = "A", // Default labels
    labelB = "B",
    autoYAxisDomain = true,
}) => {    // Calculate appropriate Y-axis domain if autoYAxisDomain is true
    const calculatedDomain = autoYAxisDomain ? calculateYAxisDomain(data, [valueKeyA, valueKeyB]) : yAxisDomain

    return (
        <ResponsiveContainer width="100%" height={260}>
            {/* Slightly taller for labels */}
            {/* BarChart is the single child of ResponsiveContainer */}
            <BarChart data={data} margin={{ top: 5, right: 30, bottom: 20, left: 30 }}>
                {showGridY && <CartesianGrid stroke="#eee" vertical={false} />}
                {showGridX && <CartesianGrid stroke="#eee" horizontal={false} />}
                <XAxis dataKey={categoryKey} tickLine={false} axisLine={false} tickFormatter={xAxisFormatter} />
                <YAxis
                    hide={hideYAxis}
                    domain={calculatedDomain}
                    tickFormatter={yAxisFormatter}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                />
                <Tooltip content={<CustomTooltip formatter={tooltipFormatter} />} />
                <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => <span style={{ color: value === labelA ? barFillA : barFillB }}>{value}</span>}
                />
                <Bar dataKey={valueKeyA} fill={barFillA} radius={[4, 4, 0, 0]} name={labelA} />
                <Bar dataKey={valueKeyB} fill={barFillB} radius={[4, 4, 0, 0]} name={labelB} />
            </BarChart>
        </ResponsiveContainer>
    )
}
