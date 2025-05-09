// Handles merging two time-series into { label, a, b }[]
export function mergeTimeSeries(
    a: Array<any> = [],
    b: Array<any> = [],
    periodKey = "period",
    valueKey = "value"
): Array<{ label: string; a: number | null; b: number | null }> {
    const mapA = Object.fromEntries(a.map(x => [String(x[periodKey]), x[valueKey]]));
    const mapB = Object.fromEntries(b.map(x => [String(x[periodKey]), x[valueKey]]));

    const periods = Array.from(new Set([...Object.keys(mapA), ...Object.keys(mapB)])).sort((p1, p2) => {
        if (p1 === "LTM") return 1;
        if (p2 === "LTM") return -1;
        const n1 = parseInt(p1), n2 = parseInt(p2);
        if (!isNaN(n1) && !isNaN(n2)) return n1 - n2;
        return p1.localeCompare(p2);
    });

    return periods.map(label => ({
        label,
        a: mapA[label] ?? null,
        b: mapB[label] ?? null,
    }));
}

// Turn "2023-05-01" → "2023"
export function formatDateLabel(dateString: string): string {
    if (dateString.includes("-")) {
        const d = new Date(dateString);
        if (!isNaN(d.getTime())) return String(d.getFullYear());
    }
    return dateString;
}
