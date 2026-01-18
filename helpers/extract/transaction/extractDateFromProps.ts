import settings from "../../../settings"
import getNormalizedDate from "../getNormalizedDate"
import type { StatementPeriodInfo } from "../getTransactions"

type DateResult = {
    date: string
    lastDate: string
}

// Infers the year for a transaction date based on statement period
function inferYear(month: number, statementPeriodInfo: StatementPeriodInfo): number | null {
    const { startYear, startMonth, endYear, endMonth } = statementPeriodInfo

    if (!endYear) return null

    // check for year boundary crossing
    if (startYear && startMonth && endMonth && startYear !== endYear) {
        if (month >= startMonth) {
            return startYear
        }
        return endYear
    }

    return endYear
}

export default function extractDateFromProps(properties: any[], statementPeriodInfo?: StatementPeriodInfo): DateResult | null {
    for (const prop of properties) {
        const propType = prop.type || "";
        const propConfidence = prop.confidence || 0;

        if (propConfidence < settings.MIN_PROPERTY_CONFIDENCE) continue;

        if (propType.includes("_date")) {
            // First try the standard normalized date (has year)
            const normalizedDate = getNormalizedDate(prop);
            if (normalizedDate) {
                return { date: normalizedDate, lastDate: normalizedDate };
            }

            // If no normalized date, try to build one with inferred year
            const dateValue = prop.normalizedValue?.dateValue;
            if (dateValue?.month && dateValue?.day && statementPeriodInfo) {
                const inferredYear = inferYear(dateValue.month, statementPeriodInfo);
                if (inferredYear) {
                    const date = `${inferredYear}-${String(dateValue.month).padStart(2, "0")}-${String(dateValue.day).padStart(2, "0")}`;
                    return { date, lastDate: date };
                }
            }

            // Fallback: try to parse mentionText and add year
            const mentionText = prop.mentionText || "";
            if (mentionText && statementPeriodInfo) {
                const match = mentionText.match(/^(\d{1,2})\/(\d{1,2})$/);
                if (match) {
                    const month = parseInt(match[1], 10);
                    const day = parseInt(match[2], 10);
                    const inferredYear = inferYear(month, statementPeriodInfo);
                    if (inferredYear) {
                        const date = `${inferredYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        return { date, lastDate: date };
                    }
                }
            }

            // Last fallback: return mentionText as-is
            if (mentionText) return { date: mentionText, lastDate: mentionText };
        }
    }
    return null;
}
