import getNormalizedMoney from "./getNormalizedMoney"
import getNormalizedDate from "./getNormalizedDate"
import getBankName from "./getBankName"

export default function getMetadata(document: any) {
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
        // Internal tracking for confidence-based selection
        _accountNumberConfidence: 0,
        _clientNameConfidence: 0,
    }

    for (const entity of document.entities) {
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
                break;

            case "statement_end_date":
                const endDate = getNormalizedDate(entity) || value;
                if (!result.statementPeriod.end || endDate.length > result.statementPeriod.end.length) {
                    result.statementPeriod.end = endDate;
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
