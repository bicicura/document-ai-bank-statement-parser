import { Document, Transaction } from "../../types"
import {
    extractDateFromProps,
    extractDescriptionFromProps,
    extractAmountFromProps,
    extractAmountFromRawText,
    extractDescriptionFromRawText,
    parseCheckInfo,
    cleanDescription
} from "./transaction"

export default function getTransactions(document: Document): Transaction[] {
    let lastDate = "";
    let transactions: Transaction[] = []

    for (const entity of document.entities || []) {
        if (entity.type !== "table_item") continue;

        const properties = entity.properties || [];
        const rawText = entity.mentionText?.trim().replace(/\n/g, " ") || "";

        // Extract from properties
        const dateResult = extractDateFromProps(properties);
        let date = dateResult?.date || "";
        if (dateResult?.lastDate) lastDate = dateResult.lastDate;

        let description = extractDescriptionFromProps(properties);
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
        }
        description = cleanDescription(description);

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
