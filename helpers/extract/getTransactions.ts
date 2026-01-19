import { Document, Transaction, DescriptionConfidence } from "../../types"
import {
    extractDateFromProps,
    extractDescriptionFromProps,
    extractAmountFromProps,
    extractAmountFromRawText,
    extractDescriptionFromRawText,
    parseCheckInfo,
    cleanDescription,
    findDescriptionInFullText
} from "./transaction"

export type StatementPeriodInfo = {
    startYear?: number
    startMonth?: number
    endYear?: number
    endMonth?: number
}

export default function getTransactions(document: Document, statementPeriodInfo?: StatementPeriodInfo): Transaction[] {
    let lastDate = "";
    let transactions: Transaction[] = []
    const fullText = document.text || "";
    const usedTextIndices = new Set<number>();

    for (const entity of document.entities || []) {
        if (entity.type !== "table_item") continue;

        const properties = entity.properties || [];
        const rawText = entity.mentionText?.trim().replace(/\n/g, " ") || "";

        // Extract from properties
        const dateResult = extractDateFromProps(properties, statementPeriodInfo);
        let date = dateResult?.date || "";
        if (dateResult?.lastDate) lastDate = dateResult.lastDate;

        let description = extractDescriptionFromProps(properties);
        let descriptionConfidence: DescriptionConfidence | undefined = description ? "high" : undefined;
        let { amount, currency } = extractAmountFromProps(properties);

        // Fallback: parse amount from rawText
        if (!amount && properties.length === 0 && rawText) {
            amount = extractAmountFromRawText(rawText);
        }

        // Extract check info from description (date + checkNumber)
        const checkInfo = parseCheckInfo(description);
        if (!date && checkInfo.date) {
            date = checkInfo.date;
        }

        // Use last known date if none found
        if (!date && lastDate) {
            date = lastDate;
        }

        // Fallback: extract description from rawText
        if (!description && rawText) {
            description = extractDescriptionFromRawText(rawText);
            if (description) {
                descriptionConfidence = "medium";
            }
        }
        description = cleanDescription(description);

        // Fallback: search in full document text for missing descriptions
        if (!description && amount && fullText && date) {
            const result = findDescriptionInFullText({
                fullText,
                amount,
                date,
                entities: document.entities || [],
                currentEntityText: rawText,
                usedIndices: usedTextIndices,
            });
            if (result) {
                description = cleanDescription(result.description);
                usedTextIndices.add(result.index);
                descriptionConfidence = "low";
            }
        }

        // Skip invalid transactions
        if (!date || !amount || isNaN(amount)) continue;

        // Build transaction
        const transaction: Transaction = {
            date,
            description,
            amount,
            rawText,
        };

        if (currency) {
            transaction.currency = currency;
        }

        if (descriptionConfidence) {
            transaction.descriptionConfidence = descriptionConfidence;
        }

        if (checkInfo.checkNumber) {
            transaction.checkNumber = checkInfo.checkNumber;
            // Checks are withdrawals - Google may extract as deposits
            if (amount > 0) {
                transaction.amount = -amount;
            }
        }

        transactions.push(transaction);
    }

    return transactions;
}
