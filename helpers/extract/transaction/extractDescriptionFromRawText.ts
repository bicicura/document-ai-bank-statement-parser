export default function extractDescriptionFromRawText(rawText: string): string {
    return rawText
        .replace(/^[A-Za-z]{3}\s+\d{1,2}\s+/, "")  // Remove "Dec 01 "
        .replace(/^\d{1,2}\/\d{1,2}\s+/, "")       // Remove "11/3 "
        .replace(/\s*-?\$?[\d,]+\.?\d*$/, "")      // Remove amount at end
        .trim();
}
