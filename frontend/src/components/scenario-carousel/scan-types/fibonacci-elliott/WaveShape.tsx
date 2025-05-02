import React from "react";
import { ChartRow } from "./fiboWaves.types";


interface WaveShapeProps {
    cx?: number;          // X coordinate to draw at
    cy?: number;          // Y coordinate to draw at
    payload?: ChartRow;   // The data row for this point
}

/**
 * Custom SVG shape for plotting Elliott Wave labels above pivot points.
 */
export const WaveShape: React.FC<WaveShapeProps> = ({ cx, cy, payload }) => {
    if (cx == null || cy == null || !payload?.waves.length) {
        return null;
    }

    return (
        <g>
            {payload.waves.map((w, i) => (
                <text
                    key={i}
                    x={cx}
                    y={cy - 12 - i * 14}          // stack labels vertically
                    fontSize={10}
                    fontWeight={600}
                    textAnchor="middle"
                    fill="#374151"
                    style={{ pointerEvents: 'none' }}
                >
                    {w.wave_label}
                </text>
            ))}
        </g>
    );
};
