import settings from "../../../settings"
import getNormalizedDate from "../getNormalizedDate"

type DateResult = {
    date: string
    lastDate: string
}

export default function extractDateFromProps(properties: any[]): DateResult | null {
    for (const prop of properties) {
        const propType = prop.type || "";
        const propConfidence = prop.confidence || 0;

        if (propConfidence < settings.MIN_PROPERTY_CONFIDENCE) continue;

        if (propType.includes("_date")) {
            const normalizedDate = getNormalizedDate(prop);
            const date = normalizedDate || prop.mentionText || "";
            if (date) return { date, lastDate: date };
        }
    }
    return null;
}
