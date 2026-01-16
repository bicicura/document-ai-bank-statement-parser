// First pass: extract bank name (needed to filter client_name later)
export default function getBankName(document: any) {
    let bankName = null

    for (const entity of document.entities) {
        if (entity.type === "bank_name") {
            const enrichedBankName = entity.normalizedValue?.text;
            bankName = enrichedBankName || entity.mentionText?.replace(/\n/g, " ");
            break;
        }
    }

    return bankName
}