/**
 * Safely parse a YYYY-MM-DD or ISO date string as UTC.
 * Returns a Date object or null if invalid.
 */
export const safeParseDate = (dateString: string): Date | null => {
    // Quick regex check for YYYY-MM-DD prefix
    if (!/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
        console.warn(`Invalid date format: ${dateString}`);
        return null;
    }

    // Split into components
    const [y, m, d] = dateString.substring(0, 10).split('-').map(n => parseInt(n, 10));
    if ([y, m, d].some(v => isNaN(v))) {
        console.warn(`Non-numeric date parts: ${dateString}`);
        return null;
    }

    // Construct UTC timestamp (month is 0-based)
    const utc = Date.UTC(y, m - 1, d);
    if (isNaN(utc)) {
        console.warn(`Could not construct date: ${dateString}`);
        return null;
    }

    return new Date(utc);
};
