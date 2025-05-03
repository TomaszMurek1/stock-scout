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
    Legend,
    ReferenceLine,
} from "recharts";
import { FC } from "react";

// Custom Tooltip component for consistent styling
const CustomTooltip: FC<any> = ({ active, payload, label, formatter }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-2 border border-gray-300 rounded shadow text-xs">
                {/* Use label directly, as XAxis dataKey or categoryKey should provide a string label */}
                <p className="font-bold">{label}</p>
                {payload.map((pld: any, index: number) => (
                    <p key={index} style={{ color: pld.stroke || pld.fill }}>
                        {/* Use the name from Line/Bar or default */}
                        {pld.name || pld.dataKey}: {formatter ? formatter(pld.value) : (pld.value !== null ? pld.value.toFixed(1) : '--')}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

interface ChartProps {
    data: any[];
    yAxisDomain?: [number, number];
    yAxisFormatter?: (value: number) => string;
    xAxisFormatter?: (value: any) => string; // Can be number or string periods
    tooltipFormatter?: (value: number | null) => string; // Updated to handle null
    hideXAxis?: boolean;
    hideYAxis?: boolean;
    showGridY?: boolean;
    showGridX?: boolean;
    lineStrokeA?: string;
    lineStrokeB?: string;
    barFillA?: string;
    barFillB?: string;
    showLegend?: boolean;
    showZeroLine?: boolean; // Option to show a line at y=0
    labelA?: string; // Label for company A (for tooltip)
    labelB?: string; // Label for company B (for tooltip)
}

export const TwoLine: FC<ChartProps> = ({
    data,
    yAxisDomain,
    yAxisFormatter,
    xAxisFormatter = (v: any) => String(v), // Default formatter converts to string
    tooltipFormatter = (v: number | null) => v !== null ? v.toFixed(1) : '--', // Default tooltip formatter
    hideXAxis = true,
    hideYAxis = true,
    showGridY = false,
    showGridX = false,
    lineStrokeA = "#000",
    lineStrokeB = "#f4a742",
    showZeroLine = false,
    labelA = 'A', // Default labels
    labelB = 'B',
}) => (
    <ResponsiveContainer width="100%" height={120}>
        {/* LineChart is the single child of ResponsiveContainer */}
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            {showGridY && <CartesianGrid stroke="#eee" vertical={false} />}
            {showGridX && <CartesianGrid stroke="#eee" horizontal={false} />}
            <XAxis dataKey="label" hide={hideXAxis} tickFormatter={xAxisFormatter} axisLine={false} tickLine={false} />
            <YAxis hide={hideYAxis} domain={yAxisDomain} tickFormatter={yAxisFormatter} axisLine={false} tickLine={false} />
            {showZeroLine && <ReferenceLine y={0} stroke="#ccc" strokeDasharray="3 3" />}
            <Tooltip
                content={<CustomTooltip formatter={tooltipFormatter} />}
            />
            <Line
                dataKey="a"
                stroke={lineStrokeA}
                strokeWidth={2}
                dot={false}
                type="monotone"
                name={labelA} // Use labelA for tooltip name
            />
            <Line
                dataKey="b"
                stroke={lineStrokeB}
                strokeWidth={2}
                dot={false}
                type="monotone"
                name={labelB} // Use labelB for tooltip name
            />
        </LineChart>
    </ResponsiveContainer>
);


export const TwoBars: FC<ChartProps> = ({
    data,
    yAxisDomain,
    yAxisFormatter,
    xAxisFormatter = (v: any) => String(v),
    tooltipFormatter = (v: number | null) => v !== null ? v.toFixed(1) : '--',
    hideXAxis = true,
    hideYAxis = true,
    showGridY = false,
    showGridX = false,
    barFillA = "#000",
    barFillB = "#f4a742",
    showZeroLine = false,
    labelA = 'A',
    labelB = 'B',
}) => (
    <ResponsiveContainer width="100%" height={120}>
        {/* BarChart is the single child of ResponsiveContainer */}
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            {showGridY && <CartesianGrid stroke="#eee" vertical={false} />}
            {showGridX && <CartesianGrid stroke="#eee" horizontal={false} />}
            <XAxis dataKey="label" hide={hideXAxis} tickFormatter={xAxisFormatter} axisLine={false} tickLine={false} />
            <YAxis hide={hideYAxis} domain={yAxisDomain} tickFormatter={yAxisFormatter} axisLine={false} tickLine={false} />
            {showZeroLine && <ReferenceLine y={0} stroke="#ccc" strokeDasharray="3 3" />}
            <Tooltip
                content={<CustomTooltip formatter={tooltipFormatter} />}
            />
            <Bar dataKey="a" fill={barFillA} radius={[4, 4, 0, 0]} name={labelA} /> // Use labelA
            <Bar dataKey="b" fill={barFillB} radius={[4, 4, 0, 0]} name={labelB} /> // Use labelB
        </BarChart>
    </ResponsiveContainer>
);

interface GroupedBarChartProps extends ChartProps {
    categoryKey: string; // Key in data for the category label (e.g., 'category')
    valueKeyA: string; // Key for company A's value (e.g., 'a')
    valueKeyB: string; // Key for company B's value (e.g., 'b')
}

export const GroupedBar: FC<GroupedBarChartProps> = ({
    data,
    yAxisDomain,
    yAxisFormatter,
    xAxisFormatter = (v: any) => String(v),
    tooltipFormatter = (v: number | null) => v !== null ? v.toFixed(1) : '--',
    hideXAxis = false, // Show X axis for categories
    hideYAxis = true,
    showGridY = false,
    showGridX = false,
    barFillA = "#000",
    barFillB = "#f4a742",
    categoryKey,
    valueKeyA,
    valueKeyB,
    labelA = 'A', // Default labels
    labelB = 'B',
}) => (
    <ResponsiveContainer width="100%" height={160}> {/* Slightly taller for labels */}
        {/* BarChart is the single child of ResponsiveContainer */}
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
            {showGridY && <CartesianGrid stroke="#eee" vertical={false} />}
            {showGridX && <CartesianGrid stroke="#eee" horizontal={false} />}
            <XAxis dataKey={categoryKey} tickLine={false} axisLine={false} tickFormatter={xAxisFormatter} />
            <YAxis hide={hideYAxis} domain={yAxisDomain} tickFormatter={yAxisFormatter} axisLine={false} tickLine={false} />
            <Tooltip
                content={<CustomTooltip formatter={tooltipFormatter} />}
            />
            <Bar dataKey={valueKeyA} fill={barFillA} radius={[4, 4, 0, 0]} name={labelA} /> // Use labelA
            <Bar dataKey={valueKeyB} fill={barFillB} radius={[4, 4, 0, 0]} name={labelB} /> // Use labelB
        </BarChart>
    </ResponsiveContainer>
);

// SimpleLineChart was removed in the previous response as its data isn't in the sample