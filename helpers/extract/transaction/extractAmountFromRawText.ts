export default function extractAmountFromRawText(rawText: string): number {
    const amountMatch = rawText.match(/(-?\$[\d,]+\.?\d*)$/) || rawText.match(/\s(-?[\d,]+\.\d{2})$/);
    if (amountMatch) {
        return parseFloat(amountMatch[1].replace(/[$,]/g, ""));
    }
    return 0;
}
