import getNormalizedMoney from "./getNormalizedMoney"
import getNormalizedDate from "./getNormalizedDate"
import getBankName from "./getBankName"

export default function getMetadata(document: any) {

    let result = {
        bankName: getBankName(document),
        bankAddress: undefined,
        accountNumber: undefined,
        _accountNumberConfidence: undefined,
        accountType: undefined,
        clientName: undefined,
        _clientNameConfidence: undefined,
        clientAddress: undefined,
        statementPeriod: undefined as any,
        _startingBalance: undefined as any,
        currency: undefined as any,
        _endingBalance: undefined as any,
        statementDate: undefined as any
    }


    // Second pass: extract all other metadata
    for (const entity of document.entities) {
        const type = entity.type || "";
        const value = entity.mentionText || "";

        switch (type) {
            case "bank_name":
                break; // Already processed in first pass
            case "bank_address":
                result.bankAddress = value?.replace(/\n/g, ", ");
                break;

            // Account info
            case "account_number":
                // Take the one with highest confidence
                const accountConfidence = entity.confidence || 0;
                if (!result.accountNumber || accountConfidence > (result._accountNumberConfidence || 0)) {
                    result.accountNumber = value;
                    result._accountNumberConfidence = accountConfidence;
                }
                break;
            case "account_type":
                result.accountType = value;
                break;

            // Client/holder info
            case "client_name":
                // Skip if it looks like a bank name (Google sometimes misclassifies)
                const cleanValue = value?.replace(/\n/g, " ").trim();
                const looksLikeBankName = result.bankName &&
                    cleanValue?.toLowerCase().includes(result.bankName.toLowerCase().split(" ")[0]);

                if (!looksLikeBankName) {
                    // Take the one with highest confidence
                    const clientConfidence = entity.confidence || 0;
                    if (!result.clientName || clientConfidence > (result._clientNameConfidence || 0)) {
                        result.clientName = cleanValue;
                        result._clientNameConfidence = clientConfidence;
                    }
                }
                break;
            case "client_address":
                result.clientAddress = value?.replace(/\n/g, ", ");
                break;

            // Statement period
            case "statement_start_date":
                result.statementPeriod = result.statementPeriod || { start: "", end: "" };
                const startDate = getNormalizedDate(entity) || value;
                // Prefer more complete dates (YYYY-MM-DD over YYYY-MM)
                if (!result.statementPeriod.start || startDate.length > result.statementPeriod.start.length) {
                    result.statementPeriod.start = startDate;
                }
                break;
            case "statement_end_date":
                result.statementPeriod = result.statementPeriod || { start: "", end: "" };
                const endDate = getNormalizedDate(entity) || value;
                if (!result.statementPeriod.end || endDate.length > result.statementPeriod.end.length) {
                    result.statementPeriod.end = endDate;
                }
                break;
            case "statement_date":
                // Use as end date fallback and also store separately
                result.statementPeriod = result.statementPeriod || { start: "", end: "" };
                const stmtDate = getNormalizedDate(entity) || value;
                if (!result.statementPeriod.end || stmtDate.length > result.statementPeriod.end.length) {
                    result.statementPeriod.end = stmtDate;
                }
                if (!result.statementDate || stmtDate.length > result.statementDate.length) {
                    result.statementDate = stmtDate;
                }
                break;

            // Balances
            case "starting_balance":
                if (result._startingBalance == null) {
                    const normalized = getNormalizedMoney(entity);
                    result._startingBalance = normalized?.amount ?? parseFloat(value.replace(/[$,]/g, ""));
                    if (normalized?.currency) result.currency = normalized.currency;
                }
                break;
            case "ending_balance":
                if (result._endingBalance == null) {
                    const normalized = getNormalizedMoney(entity);
                    result._endingBalance = normalized?.amount ?? parseFloat(value.replace(/[$,]/g, ""));
                    if (normalized?.currency) result.currency = normalized.currency;
                }
                break;
        }
    }

    return result
}