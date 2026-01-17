export default function buildBalance(starting?: number, ending?: number) {
    if (starting != null || ending != null) {
        const start = starting ?? 0;
        const end = ending ?? 0;
        return {
            start,
            end,
            change: Math.round((end - start) * 100) / 100,
        };
    }
}