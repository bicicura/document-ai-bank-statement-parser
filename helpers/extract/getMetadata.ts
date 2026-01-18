import getNormalizedMoney from "./getNormalizedMoney"
import getNormalizedDate from "./getNormalizedDate"
import getBankName from "./getBankName"
import { Document } from "../../types"

export default function getMetadata(document: Document) {
    const bankName = getBankName(document)

    let result = {
        bank: {
            name: bankName,
            address: undefined as string | undefined,
        },
        client: {
            name: undefined as string | undefined,
            address: undefined as string | undefined,
        },
        account: {
            number: undefined as string | undefined,
            type: undefined as string | undefined,
        },
        statementPeriod: {
            start: undefined as string | undefined,
            end: undefined as string | undefined,
            issued: undefined as string | undefined,
        },
        currency: undefined as string | undefined,
        _balance: {
            start: undefined as number | undefined,
            end: undefined as number | undefined,
        },
        _statementPeriodInfo: {
            startYear: undefined as number | undefined,
            startMonth: undefined as number | undefined,
            endYear: undefined as number | undefined,
            endMonth: undefined as number | undefined,
        },
        _accountNumberConfidence: 0,
        _clientNameConfidence: 0,
    }

    for (const entity of document.entities || []) {
        const type = entity.type || "";
        const value = entity.mentionText || "";

        switch (type) {
            case "bank_name":
                break;

            case "bank_address":
                result.bank.address = value?.replace(/\n/g, ", ");
                break;

            case "account_number":
                const accountConfidence = entity.confidence || 0;
                if (!result.account.number || accountConfidence > result._accountNumberConfidence) {
                    result.account.number = value;
                    result._accountNumberConfidence = accountConfidence;
                }
                break;

            case "account_type":
                result.account.type = value;
                break;

            case "client_name":
                const cleanValue = value?.replace(/\n/g, " ").trim();
                const looksLikeBankName = bankName &&
                    cleanValue?.toLowerCase().includes(bankName.toLowerCase().split(" ")[0]);

                if (!looksLikeBankName) {
                    const clientConfidence = entity.confidence || 0;
                    if (!result.client.name || clientConfidence > result._clientNameConfidence) {
                        result.client.name = cleanValue;
                        result._clientNameConfidence = clientConfidence;
                    }
                }
                break;

            case "client_address":
                result.client.address = value?.replace(/\n/g, ", ");
                break;

            case "statement_start_date":
                const startDate = getNormalizedDate(entity) || value;
                if (!result.statementPeriod.start || startDate.length > result.statementPeriod.start.length) {
                    result.statementPeriod.start = startDate;
                }
                // Extract year/month for inferring transaction years
                const startDateValue = entity.normalizedValue?.dateValue;
                if (startDateValue?.year && startDateValue?.month) {
                    result._statementPeriodInfo.startYear = startDateValue.year;
                    result._statementPeriodInfo.startMonth = startDateValue.month;
                }
                break;

            case "statement_end_date":
                const endDate = getNormalizedDate(entity) || value;
                if (!result.statementPeriod.end || endDate.length > result.statementPeriod.end.length) {
                    result.statementPeriod.end = endDate;
                }
                // Extract year/month for inferring transaction years
                const endDateValue = entity.normalizedValue?.dateValue;
                if (endDateValue?.year && endDateValue?.month) {
                    result._statementPeriodInfo.endYear = endDateValue.year;
                    result._statementPeriodInfo.endMonth = endDateValue.month;
                }
                break;

            case "statement_date":
                const stmtDate = getNormalizedDate(entity) || value;
                if (!result.statementPeriod.end || stmtDate.length > result.statementPeriod.end.length) {
                    result.statementPeriod.end = stmtDate;
                }
                if (!result.statementPeriod.issued || stmtDate.length > result.statementPeriod.issued.length) {
                    result.statementPeriod.issued = stmtDate;
                }
                // Fallback: use statement_date for year if end_date not available
                const stmtDateValue = entity.normalizedValue?.dateValue;
                if (stmtDateValue?.year && stmtDateValue?.month && !result._statementPeriodInfo.endYear) {
                    result._statementPeriodInfo.endYear = stmtDateValue.year;
                    result._statementPeriodInfo.endMonth = stmtDateValue.month;
                }
                break;

            case "starting_balance":
                if (result._balance.start == null) {
                    const normalized = getNormalizedMoney(entity);
                    result._balance.start = normalized?.amount ?? parseFloat(value.replace(/[$,]/g, ""));
                    if (normalized?.currency) result.currency = normalized.currency;
                }
                break;

            case "ending_balance":
                if (result._balance.end == null) {
                    const normalized = getNormalizedMoney(entity);
                    result._balance.end = normalized?.amount ?? parseFloat(value.replace(/[$,]/g, ""));
                    if (normalized?.currency) result.currency = normalized.currency;
                }
                break;
        }
    }

    const { _accountNumberConfidence, _clientNameConfidence, ...metadata } = result
    return metadata
}
