import * as fs from "fs";
import extractData from "./helpers/extract"
import parseDocument from "./helpers/parseDocument"
import saveResult from "./helpers/saveResult"
import getProcessorInfo from "./helpers/getProcessorInfo"

async function app() {
    const inputFile = process.argv[2] || "input/bank-statement.pdf";
    const showProcessorInfo = process.argv.includes("--processor-info");

    if (!fs.existsSync(inputFile)) {
        console.error(`Error: Input file not found: ${inputFile}`);
        process.exit(1);
    }

    if (showProcessorInfo) {
        const info = await getProcessorInfo();
        if (info) {
            console.log("\n=== Processor Info ===");
            console.log(`Name: ${info.displayName}`);
            console.log(`Type: ${info.type}`);
            console.log(`Default Version: ${info.defaultVersionId}`);
            console.log(`Available Versions:`);
            info.availableVersions.forEach(v => console.log(`  - ${v}`));
            console.log("======================\n");
        }
    }

    console.log(`Processing: ${inputFile}`);

    const document = await parseDocument(inputFile);

    if (!document) {
        console.error("Error: Failed to parse document");
        process.exit(1);
    }

    const output = extractData(document);
    const { outputPath, rawPath } = saveResult(output)

    console.log(`Result saved to: ${outputPath}`, `Raw response saved to: ${rawPath}`);
    console.log(`Found ${output.transactions.items.length} transactions`);
}

app().catch((error) => {
    console.error("Error:", error.message);
    process.exit(1);
});
