import settings from "../../settings"
import getNormalizedMoney from "../getNormalizedMoney"
import getNormalizedDate from "../getNormalizedDate"
import { Transaction } from "../../types"

export default function getTransactions(document: any) {
    let lastDate = "";
    let transactions = []

    for (const entity of document.entities) {
        if (entity.type !== "table_item") continue;

        const properties = entity.properties || [];
        const rawText = entity.mentionText?.trim().replace(/\n/g, " ") || "";

        // Extract from child properties (normalized values)
        let date = "";
        let description = "";
        let amount = 0;
        let amountConfidence = 0;
        let currency = "";

        for (const prop of properties) {
            const propType = prop.type || "";
            const propConfidence = prop.confidence || 0;

            // Skip low confidence properties (garbage data)
            if (propConfidence < settings.MIN_PROPERTY_CONFIDENCE) continue;

            // Date (withdrawal or deposit)
            if (propType.includes("_date")) {
                const normalizedDate = getNormalizedDate(prop);
                date = normalizedDate || prop.mentionText || "";
                if (date) lastDate = date;
            }

            // Description (may have multiple parts, concatenate them)
            if (propType.includes("_description")) {
                const descPart = prop.mentionText?.trim() || "";
                if (descPart) {
                    description = description ? `${description} ${descPart}` : descPart;
                }
            }

            // Amount (withdrawal or deposit) - use highest confidence if both present
            if (propType.includes("transaction_withdrawal") && !propType.includes("_date") && !propType.includes("_description")) {
                if (propConfidence > amountConfidence) {
                    const normalized = getNormalizedMoney(prop);
                    if (normalized) {
                        amount = -Math.abs(normalized.amount); // Withdrawals are negative
                        currency = normalized.currency;
                    } else {
                        amount = -Math.abs(parseFloat(prop.mentionText?.replace(/[$,]/g, "") || "0"));
                    }
                    amountConfidence = propConfidence;
                }
            }

            if (propType.includes("transaction_deposit") && !propType.includes("_date") && !propType.includes("_description")) {
                if (propConfidence > amountConfidence) {
                    const normalized = getNormalizedMoney(prop);
                    if (normalized) {
                        amount = Math.abs(normalized.amount); // Deposits are positive
                        currency = normalized.currency;
                    } else {
                        amount = Math.abs(parseFloat(prop.mentionText?.replace(/[$,]/g, "") || "0"));
                    }
                    amountConfidence = propConfidence;
                }
            }
        }

        // Fallback: if no properties, parse from mentionText (legacy behavior)
        if (properties.length === 0 && rawText) {
            const amountMatch = rawText.match(/(-?\$[\d,]+\.?\d*)$/) || rawText.match(/\s(-?[\d,]+\.\d{2})$/);
            if (amountMatch) {
                amount = parseFloat(amountMatch[1].replace(/[$,]/g, ""));
            }
        }

        // Try to extract date from description if missing (common for check images)
        // Pattern: "PD MM/DD/YYYY" or "CK #XXXX\nPD MM/DD/YYYY"
        let checkNumber = "";
        if (!date && description) {
            const pdMatch = description.match(/PD\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
            if (pdMatch) {
                const [month, day, year] = pdMatch[1].split("/");
                date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
            }
            // Extract check number if present
            const ckMatch = description.match(/CK\s*#\s*(\d+)/i);
            if (ckMatch) {
                checkNumber = ckMatch[1];
            }
        }

        // Use last known date if none found
        if (!date && lastDate) {
            date = lastDate;
        }

        // Fallback: extract description from rawText if empty or whitespace
        if ((!description || description.trim() === "") && rawText) {
            // Remove date at start, amount at end
            let fallbackDesc = rawText
                .replace(/^[A-Za-z]{3}\s+\d{1,2}\s+/, "")  // Remove "Dec 01 "
                .replace(/^\d{1,2}\/\d{1,2}\s+/, "")       // Remove "11/3 "
                .replace(/\s*-?\$?[\d,]+\.?\d*$/, "")      // Remove amount at end
                .trim();
            description = fallbackDesc;
        }

        // Clean up description
        description = description
            .replace(/\s*\.{2,}\d{4}$/, "")      // Remove card suffix "..9891"
            .replace(/\s+/g, " ")
            .replace(/^[\s\-→←↑↓<>]+/, "")
            .replace(/[\s\-→←↑↓<>]+$/, "")
            .trim();

        // Skip if no valid date OR no valid amount (garbage transactions)
        if (!date || !amount || isNaN(amount)) continue;

        const transaction: Transaction = {
            date,
            description,
            amount,
            rawText,
        };

        if (currency) {
            transaction.currency = currency;
        }
        if (checkNumber) {
            transaction.checkNumber = checkNumber;
            // Checks written by account holder are withdrawals (negative)
            // Google may extract them as deposits from check images
            if (amount > 0) {
                transaction.amount = -amount;
            }
        }

        transactions.push(transaction)
    }

    return { transactions }
}