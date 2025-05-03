import {
    LineChart,
    Line,
    BarChart,
    Bar,
    Tooltip,
    ResponsiveContainer,
    XAxis,
    YAxis,
} from "recharts";

export const TwoLine: React.FC<{ data: any[] }> = ({ data }) => (
    <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data}>
            <Line
                dataKey="a"
                stroke="#000"
                strokeWidth={2}
                dot={false}
                type="monotone"
            />
            <Line
                dataKey="b"
                stroke="#f4a742"
                strokeWidth={2}
                dot={false}
                type="monotone"
            />
            <XAxis dataKey="label" hide />
            <YAxis hide />
            <Tooltip formatter={(v: number) => v.toFixed(1) + "%"} />
        </LineChart>
    </ResponsiveContainer>
);

export const TwoBars: React.FC<{ data: any[] }> = ({ data }) => (
    <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data}>
            <Bar dataKey="a" fill="#000" radius={[4, 4, 0, 0]} />
            <Bar dataKey="b" fill="#f4a742" radius={[4, 4, 0, 0]} />
            <XAxis dataKey="label" hide />
            <YAxis hide />
            <Tooltip formatter={(v: number) => v.toFixed(1) + "%"} />
        </BarChart>
    </ResponsiveContainer>
);
