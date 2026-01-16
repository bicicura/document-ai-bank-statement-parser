export default function getNormalizedDate(entity: any): string | null {
    const nv = entity?.normalizedValue;
    if (nv?.dateValue) {
        const { year, month, day } = nv.dateValue;
        if (year && month && day) {
            return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        }
    }
    if (nv?.text && /^\d{4}-\d{2}-\d{2}$/.test(nv.text)) {
        return nv.text;
    }
    return null;
}