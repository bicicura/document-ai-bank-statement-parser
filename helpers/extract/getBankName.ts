import { Document } from "../../types"

// First pass: extract bank name (needed to filter client_name later)
export default function getBankName(document: Document): string | undefined {
    for (const entity of document.entities || []) {
        if (entity.type === "bank_name") {
            const enrichedBankName = entity.normalizedValue?.text;
            return enrichedBankName || entity.mentionText?.replace(/\n/g, " ") || undefined;
        }
    }
    return undefined
}