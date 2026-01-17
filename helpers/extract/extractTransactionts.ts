import { ParsedResult } from "../../types"
import getMetadata from "./getMetadata"
import getTransactions from "./getTransactions"
import getChecks from "./getChecks"
import getTotals from "./getTotals"

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
    const { transactions: items } = getTransactions(document)
    result.transactions.items = items

    const checks = getChecks(document, result.transactions.items)
    result.transactions.items = [...result.transactions.items, ...checks]

    result.transactions.totals = getTotals(result.transactions.items)

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