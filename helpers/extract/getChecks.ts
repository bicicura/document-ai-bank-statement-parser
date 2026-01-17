import { Document, Transaction } from "../../types"

export default function getChecks(document: Document, transactions: Transaction[]) {
    // Post-process: Extract missing checks from raw document text
    // Google Document AI sometimes misses check amounts in check images
    const existingCheckNumbers = new Set(
        transactions
            .filter(tx => tx.checkNumber)
            .map(tx => tx.checkNumber)
    );
    let result: Transaction[] = []

    if (document.text) {
        // Pattern 1: "CK #XXXX\nPD MM/DD/YYYY\n$XXX.XX" (Eastern Bank check images)
        const checkPattern1 = /CK\s*#\s*(\d+)\s*\n\s*PD\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*\n?\s*\$?([\d,]+\.?\d*)/gi;
        let match;
        while ((match = checkPattern1.exec(document.text)) !== null) {
            const [, checkNum, dateStr, amountStr] = match;
            if (existingCheckNumbers.has(checkNum)) continue;

            const [month, day, year] = dateStr.split("/");
            const date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
            const amount = -Math.abs(parseFloat(amountStr.replace(/,/g, "")));

            if (!isNaN(amount) && amount !== 0) {
                result.push({
                    date,
                    description: `Check #${checkNum}`,
                    amount,
                    checkNumber: checkNum,
                    rawText: match[0],
                });
                existingCheckNumbers.add(checkNum);
            }
        }

        // Pattern 2: "260 03/14/2025 $1,080.00" (Citizens Bank check images)
        const checkPattern2 = /\b(\d{3,4})\s+(\d{2}\/\d{2}\/\d{4})\s+\$([\d,]+\.?\d*)/g;
        while ((match = checkPattern2.exec(document.text)) !== null) {
            const [, checkNum, dateStr, amountStr] = match;
            if (existingCheckNumbers.has(checkNum)) continue;

            const [month, day, year] = dateStr.split("/");
            const date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
            const amount = -Math.abs(parseFloat(amountStr.replace(/,/g, "")));

            if (!isNaN(amount) && amount !== 0) {
                result.push({
                    date,
                    description: `Check #${checkNum}`,
                    amount,
                    checkNumber: checkNum,
                    rawText: match[0],
                });
                existingCheckNumbers.add(checkNum);
            }
        }
    }

    return result
}