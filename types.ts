import { google } from "@google-cloud/documentai/build/protos/protos"

// Google Document AI types
export type Document = google.cloud.documentai.v1.IDocument
export type Entity = google.cloud.documentai.v1.Document.IEntity

export type DescriptionConfidence = "high" | "medium" | "low"

export interface Transaction {
    date: string;
    description: string;
    amount: number;
    currency?: string;
    balance?: number;
    checkNumber?: string;
    rawText?: string;
    /**
     * Confidence level for the description extraction:
     * - high: extracted directly from Google Doc AI properties
     * - medium: extracted from rawText (entity.mentionText)
     * - low: found via fallback search in full document text
     */
    descriptionConfidence?: DescriptionConfidence;
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
    rawResponse: Document;
}