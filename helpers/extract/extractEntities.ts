import { ParsedResult } from "../../types"
import getMetadata from "./getMetadata"
import getTransactions from "./getTransactions"
import getChecks from "./getChecks"
import getTotals from "./getTotals"
import buildBalance from "../buildBalance"

export default function extractEntities(document: any): ParsedResult {
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
    result.balance = buildBalance(result._startingBalance, result._endingBalance)

    // Clean up temporary tracking fields
    const { _startingBalance, _endingBalance, _accountNumberConfidence, _clientNameConfidence, ...finalResult } = result

    return finalResult;
}