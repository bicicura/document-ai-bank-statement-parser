import * as fs from "fs";
import * as path from "path";
import extractTransactions from "../helpers/extract/extractTransactionts"
import parseDocument from "../helpers/parseDocument"

async function main() {
  const inputFile = process.argv[2] || "input/bank-statement.pdf";

  if (!fs.existsSync(inputFile)) {
    console.error(`Error: Input file not found: ${inputFile}`);
    process.exit(1);
  }

  console.log(`Processing: ${inputFile}`);

  const document = await parseDocument(inputFile);
  const parsed = extractTransactions(document);

  // Save result (without rawResponse to keep file small)
  const outputDir = "output";
  fs.mkdirSync(outputDir, { recursive: true });

  const { rawResponse, ...cleanResult } = parsed;
  const outputPath = path.join(outputDir, "parsed-result.json");
  fs.writeFileSync(outputPath, JSON.stringify(cleanResult, null, 2));

  // Save raw response separately if needed
  const rawPath = path.join(outputDir, "raw-response.json");
  fs.writeFileSync(rawPath, JSON.stringify(rawResponse, null, 2));

  console.log(`Result saved to: ${outputPath}`);
  console.log(`Raw response saved to: ${rawPath}`);
  console.log(`Found ${parsed.transactions.items.length} transactions`);
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
