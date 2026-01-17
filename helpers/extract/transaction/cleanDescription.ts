export default function cleanDescription(description: string): string {
    return description
        .replace(/\s*\.{2,}\d{4}$/, "")      // Remove card suffix "..9891"
        .replace(/\s+/g, " ")
        .replace(/^[\s\-→←↑↓<>]+/, "")
        .replace(/[\s\-→←↑↓<>]+$/, "")
        .trim();
}
