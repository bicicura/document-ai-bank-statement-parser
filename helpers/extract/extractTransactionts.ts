import settings from "../../settings"
import { Transaction, ParsedResult } from "../../types"
import getNormalizedMoney from "../getNormalizedMoney"
import getNormalizedDate from "../getNormalizedDate"
import getMetadata from "./getMetadata"

export default function extractTransactions(document: any): ParsedResult {
    const result: ParsedResult = {
        transactions: {
            items: [],
            totals: {
                positive: 0,
                negative: 0,
                net: 0,
            },
        },
        rawResponse: document,
    };

    if (!document?.entities) {
        return result;
    }

    const metadata = getMetadata(document)

    result.bankName = metadata.bankName
    result.bankAddress = metadata.bankAddress
    result.accountNumber = metadata.accountNumber
    result._accountNumberConfidence = metadata._accountNumberConfidence
    result.accountType = metadata.accountType
    result.clientName = metadata.clientName
    result._clientNameConfidence = metadata._clientNameConfidence
    result.clientAddress = metadata.clientAddress
    result.statementPeriod = metadata.statementPeriod
    result._startingBalance = metadata._startingBalance
    result.currency = metadata.currency
    result._endingBalance = metadata._endingBalance
    result.statementDate = metadata.statementDate

    // Extract transactions from table_item entities using child properties
    let lastDate = "";

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

        result.transactions.items.push(transaction);
    }

    // Post-process: Extract missing checks from raw document text
    // Google Document AI sometimes misses check amounts in check images
    const existingCheckNumbers = new Set(
        result.transactions.items
            .filter(tx => tx.checkNumber)
            .map(tx => tx.checkNumber)
    );

    if (document.text) {
        // Pattern 1: "CK #XXXX\nPD MM/DD/YYYY\n$XXX.XX" (Eastern Bank check images)
        const checkPattern1 = /CK\s*#\s*(\d+)\s*\n\s*PD\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*\n?\s*\$?([\d,]+\.?\d*)/gi;
        let match;
        while ((match = checkPattern1.exec(document.text)) !== null) {
            const [, checkNum, dateStr, amountStr] = match;
            if (existingCheckNumbers.has(checkNum)) continue;

            const [month, day, year] = dateStr.split("/");
            const date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
            const amount = -Math.abs(parseFloat(amountStr.replace(/,/g, "")));

            if (!isNaN(amount) && amount !== 0) {
                result.transactions.items.push({
                    date,
                    description: `Check #${checkNum}`,
                    amount,
                    checkNumber: checkNum,
                    rawText: match[0],
                });
                existingCheckNumbers.add(checkNum);
            }
        }

        // Pattern 2: "260 03/14/2025 $1,080.00" (Citizens Bank check images)
        const checkPattern2 = /\b(\d{3,4})\s+(\d{2}\/\d{2}\/\d{4})\s+\$([\d,]+\.?\d*)/g;
        while ((match = checkPattern2.exec(document.text)) !== null) {
            const [, checkNum, dateStr, amountStr] = match;
            if (existingCheckNumbers.has(checkNum)) continue;

            const [month, day, year] = dateStr.split("/");
            const date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
            const amount = -Math.abs(parseFloat(amountStr.replace(/,/g, "")));

            if (!isNaN(amount) && amount !== 0) {
                result.transactions.items.push({
                    date,
                    description: `Check #${checkNum}`,
                    amount,
                    checkNumber: checkNum,
                    rawText: match[0],
                });
                existingCheckNumbers.add(checkNum);
            }
        }
    }

    // Calculate transaction totals
    for (const tx of result.transactions.items) {
        result.transactions.totals.net += tx.amount;
        if (tx.amount > 0) {
            result.transactions.totals.positive += tx.amount;
        } else {
            result.transactions.totals.negative += tx.amount;
        }
    }

    // Round totals to avoid floating point issues
    result.transactions.totals.net = Math.round(result.transactions.totals.net * 100) / 100;
    result.transactions.totals.positive = Math.round(result.transactions.totals.positive * 100) / 100;
    result.transactions.totals.negative = Math.round(result.transactions.totals.negative * 100) / 100;

    // Build balance object
    if (result._startingBalance != null || result._endingBalance != null) {
        const start = result._startingBalance ?? 0;
        const end = result._endingBalance ?? 0;
        result.balance = {
            start,
            end,
            change: Math.round((end - start) * 100) / 100,
        };
    }

    // Clean up temporary tracking fields
    delete result._startingBalance;
    delete result._endingBalance;
    delete result._accountNumberConfidence;
    delete result._clientNameConfidence;

    return result;
}