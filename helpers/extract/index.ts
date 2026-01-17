import { ParsedResult } from "../../types"
import getMetadata from "./getMetadata"
import getTransactions from "./getTransactions"
import getChecks from "./getChecks"
import buildTotals from "./buildTotals"
import buildBalance from "./buildBalance"

export default function extractData(document: any): ParsedResult {
    const result: ParsedResult = {
        bank: {
            name: undefined,
            address: undefined,
        },
        client: {
            name: undefined,
            address: undefined,
        },
        account: {
            type: undefined,
            number: undefined
        },
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

    result.bank.name = metadata.bankName
    result.bank.address = metadata.bankAddress

    result.client.name = metadata.clientName
    result.client.address = metadata.clientAddress

    result.account.number = metadata.accountNumber
    result.account.type = metadata.accountType

    result.statementPeriod = { ...metadata.statementPeriod, issued: metadata.statementDate }
    result.currency = metadata.currency

    // Extract transactions from table_item entities using child properties
    const { transactions: items } = getTransactions(document)
    result.transactions.items = items

    const checks = getChecks(document, result.transactions.items)
    result.transactions.items = [...result.transactions.items, ...checks]

    result.transactions.totals = buildTotals(result.transactions.items)
    result.balance = buildBalance(metadata._startingBalance, metadata._endingBalance)

    return result;
}