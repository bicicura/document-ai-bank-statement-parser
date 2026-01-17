import settings from "../../../settings"
import getNormalizedMoney from "../getNormalizedMoney"

type AmountResult = {
    amount: number
    currency: string
}

export default function extractAmountFromProps(properties: any[]): AmountResult {
    let amount = 0;
    let amountConfidence = 0;
    let currency = "";

    for (const prop of properties) {
        const propType = prop.type || "";
        const propConfidence = prop.confidence || 0;

        if (propConfidence < settings.MIN_PROPERTY_CONFIDENCE) continue;

        // Withdrawal (negative)
        if (propType.includes("transaction_withdrawal") &&
            !propType.includes("_date") &&
            !propType.includes("_description")) {
            if (propConfidence > amountConfidence) {
                const normalized = getNormalizedMoney(prop);
                if (normalized) {
                    amount = -Math.abs(normalized.amount);
                    currency = normalized.currency;
                } else {
                    amount = -Math.abs(parseFloat(prop.mentionText?.replace(/[$,]/g, "") || "0"));
                }
                amountConfidence = propConfidence;
            }
        }

        // Deposit (positive)
        if (propType.includes("transaction_deposit") &&
            !propType.includes("_date") &&
            !propType.includes("_description")) {
            if (propConfidence > amountConfidence) {
                const normalized = getNormalizedMoney(prop);
                if (normalized) {
                    amount = Math.abs(normalized.amount);
                    currency = normalized.currency;
                } else {
                    amount = Math.abs(parseFloat(prop.mentionText?.replace(/[$,]/g, "") || "0"));
                }
                amountConfidence = propConfidence;
            }
        }
    }

    return { amount, currency };
}
