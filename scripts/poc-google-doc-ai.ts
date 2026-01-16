import * as fs from "fs";
import extractTransactions from "../helpers/extract/extractTransactionts"
import parseDocument from "../helpers/parseDocument"
import saveResult from "../helpers/saveResult"

async function main() {
  const inputFile = process.argv[2] || "input/bank-statement.pdf";

  if (!fs.existsSync(inputFile)) {
    console.error(`Error: Input file not found: ${inputFile}`);
    process.exit(1);
  }

  console.log(`Processing: ${inputFile}`);

  const document = await parseDocument(inputFile);

  const parsed = extractTransactions(document);
  const { outputPath, rawPath } = saveResult(parsed)

  console.log(`Result saved to: ${outputPath}`, `Raw response saved to: ${rawPath}`);
  console.log(`Found ${parsed.transactions.items.length} transactions`);
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
