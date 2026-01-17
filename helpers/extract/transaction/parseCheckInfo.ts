type CheckInfo = {
    date: string | null
    checkNumber: string | null
}

export default function parseCheckInfo(description: string): CheckInfo {
    let date: string | null = null;
    let checkNumber: string | null = null;

    // Pattern: "PD MM/DD/YYYY"
    const pdMatch = description.match(/PD\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (pdMatch) {
        const [month, day, year] = pdMatch[1].split("/");
        date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    // Pattern: "CK #XXXX"
    const ckMatch = description.match(/CK\s*#\s*(\d+)/i);
    if (ckMatch) {
        checkNumber = ckMatch[1];
    }

    return { date, checkNumber };
}
