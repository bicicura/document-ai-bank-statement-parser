import { Document, ParsedResult } from "../../types"
import getMetadata from "./getMetadata"
import getTransactions from "./getTransactions"
import getChecks from "./getChecks"
import buildTotals from "./buildTotals"
import buildBalance from "./buildBalance"

export default function extractData(document: Document): ParsedResult {
    if (!document?.entities) {
        return {
            bank: {},
            client: {},
            account: {},
            transactions: { items: [], totals: { positive: 0, negative: 0, net: 0 } },
            rawResponse: document,
        }
    }

    const { _balance, _statementPeriodInfo, ...metadata } = getMetadata(document)
    const transactions = getTransactions(document, _statementPeriodInfo)
    const checks = getChecks(document, transactions)
    const items = [...transactions, ...checks]

    return {
        ...metadata,
        balance: buildBalance(_balance.start, _balance.end),
        transactions: {
            items,
            totals: buildTotals(items),
        },
        rawResponse: document,
    }
}
