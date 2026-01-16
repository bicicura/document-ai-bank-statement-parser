export interface Transaction {
    date: string;
    description: string;
    amount: number;
    currency?: string;
    balance?: number;
    checkNumber?: string;
    rawText?: string;
}

export interface ParsedResult {
    // Bank info
    bankName?: string;
    bankAddress?: string;

    // Account info
    accountNumber?: string;
    accountType?: string;

    // Client/holder info
    clientName?: string;
    clientAddress?: string;

    // Statement period
    statementPeriod?: {
        start: string;
        end: string;
    };
    statementDate?: string;

    // Balances
    balance?: {
        start: number;
        end: number;
        change: number;
    };
    currency?: string;

    // Transactions
    transactions: {
        items: Transaction[];
        totals: {
            positive: number;
            negative: number;
            net: number;
        };
    };
    rawResponse: unknown;

    // Internal tracking (removed before output)
    _startingBalance?: number;
    _endingBalance?: number;

    // Internal tracking (removed before output)
    _accountNumberConfidence?: number;
    _clientNameConfidence?: number;
}