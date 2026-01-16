import * as fs from "fs";
import * as path from "path";

export default function saveResult(parsed: any) {
    // Save result (without rawResponse to keep file small)
    const outputDir = "output";
    fs.mkdirSync(outputDir, { recursive: true });

    const { rawResponse, ...cleanResult } = parsed;
    const outputPath = path.join(outputDir, "parsed-result.json");
    fs.writeFileSync(outputPath, JSON.stringify(cleanResult, null, 2));

    // Save raw response separately if needed
    const rawPath = path.join(outputDir, "raw-response.json");
    fs.writeFileSync(rawPath, JSON.stringify(rawResponse, null, 2));

    return { outputPath, rawPath }
}