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
    bank: {
        name?: string;
        address?: string;
    };

    client: {
        name?: string;
        address?: string;
    }

    account: {
        type?: string;
        number?: string;
    }

    // Statement period
    statementPeriod?: {
        start?: string;
        end?: string;
        issued?: string;
    };

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
}