import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import * as fs from "fs";
import * as path from "path";

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;
const LOCATION = process.env.GOOGLE_DOC_AI_LOCATION || "us";
const PROCESSOR_ID = process.env.GOOGLE_DOC_AI_PROCESSOR_ID;

interface Transaction {
  date: string;
  description: string;
  amount: number;
  currency?: string;
  balance?: number;
  checkNumber?: string;
  rawText?: string;
}

// Helper to extract normalized value from entity
function getNormalizedMoney(entity: any): { amount: number; currency: string } | null {
  const nv = entity?.normalizedValue;
  if (nv?.moneyValue) {
    const units = parseInt(nv.moneyValue.units || "0", 10);
    const nanos = (nv.moneyValue.nanos || 0) / 1e9;
    return {
      amount: units + nanos,
      currency: nv.moneyValue.currencyCode || "USD",
    };
  }
  return null;
}

function getNormalizedDate(entity: any): string | null {
  const nv = entity?.normalizedValue;
  if (nv?.dateValue) {
    const { year, month, day } = nv.dateValue;
    if (year && month && day) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  if (nv?.text && /^\d{4}-\d{2}-\d{2}$/.test(nv.text)) {
    return nv.text;
  }
  return null;
}

interface ParsedResult {
  // Bank info
  bankName?: string;
  bankAddress?: string;

  // Account info
  accountNumber?: string;
  accountType?: string;

  // Client/holder info
  clientName?: string;
  clientAddress?: string;

  // Statement period
  statementPeriod?: {
    start: string;
    end: string;
  };

  // Balances
  startingBalance?: number;
  endingBalance?: number;
  currency?: string;

  // Transactions
  transactions: Transaction[];
  rawResponse: unknown;

  // Internal tracking (removed before output)
  _accountNumberConfidence?: number;
  _clientNameConfidence?: number;
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
  };
  return mimeTypes[ext] || "application/pdf";
}

async function parseDocument(filePath: string) {
  if (!PROJECT_ID || !PROCESSOR_ID) {
    throw new Error(
      "Missing required environment variables: GOOGLE_CLOUD_PROJECT and GOOGLE_DOC_AI_PROCESSOR_ID"
    );
  }

  const client = new DocumentProcessorServiceClient();

  const fileBuffer = fs.readFileSync(filePath);
  const encodedFile = fileBuffer.toString("base64");

  const request = {
    name: `projects/${PROJECT_ID}/locations/${LOCATION}/processors/${PROCESSOR_ID}`,
    rawDocument: {
      content: encodedFile,
      mimeType: getMimeType(filePath),
    },
  };

  const [result] = await client.processDocument(request);
  return result.document;
}

function extractTransactions(document: any): ParsedResult {
  const result: ParsedResult = {
    transactions: [],
    rawResponse: document,
  };

  if (!document?.entities) {
    return result;
  }

  // First pass: extract bank name (needed to filter client_name later)
  for (const entity of document.entities) {
    if (entity.type === "bank_name") {
      const enrichedBankName = entity.normalizedValue?.text;
      result.bankName = enrichedBankName || entity.mentionText?.replace(/\n/g, " ");
      break;
    }
  }

  // Second pass: extract all other metadata
  for (const entity of document.entities) {
    const type = entity.type || "";
    const value = entity.mentionText || "";

    switch (type) {
      // Bank info (already extracted, but handle address)
      case "bank_name":
        // Already processed in first pass
        break;
      case "bank_address":
        result.bankAddress = value?.replace(/\n/g, ", ");
        break;

      // Account info
      case "account_number":
        // Take the one with highest confidence
        const accountConfidence = entity.confidence || 0;
        if (!result.accountNumber || accountConfidence > (result._accountNumberConfidence || 0)) {
          result.accountNumber = value;
          result._accountNumberConfidence = accountConfidence;
        }
        break;
      case "account_type":
        result.accountType = value;
        break;

      // Client/holder info
      case "client_name":
        // Skip if it looks like a bank name (Google sometimes misclassifies)
        const cleanValue = value?.replace(/\n/g, " ").trim();
        const looksLikeBankName = result.bankName &&
          cleanValue?.toLowerCase().includes(result.bankName.toLowerCase().split(" ")[0]);

        if (!looksLikeBankName) {
          // Take the one with highest confidence
          const clientConfidence = entity.confidence || 0;
          if (!result.clientName || clientConfidence > (result._clientNameConfidence || 0)) {
            result.clientName = cleanValue;
            result._clientNameConfidence = clientConfidence;
          }
        }
        break;
      case "client_address":
        result.clientAddress = value?.replace(/\n/g, ", ");
        break;

      // Statement period
      case "statement_start_date":
        result.statementPeriod = result.statementPeriod || { start: "", end: "" };
        const startDate = getNormalizedDate(entity) || value;
        // Prefer more complete dates (YYYY-MM-DD over YYYY-MM)
        if (!result.statementPeriod.start || startDate.length > result.statementPeriod.start.length) {
          result.statementPeriod.start = startDate;
        }
        break;
      case "statement_end_date":
      case "statement_date":
        result.statementPeriod = result.statementPeriod || { start: "", end: "" };
        const endDate = getNormalizedDate(entity) || value;
        if (!result.statementPeriod.end || endDate.length > result.statementPeriod.end.length) {
          result.statementPeriod.end = endDate;
        }
        break;

      // Balances
      case "starting_balance":
        if (result.startingBalance == null) {
          const normalized = getNormalizedMoney(entity);
          result.startingBalance = normalized?.amount ?? parseFloat(value.replace(/[$,]/g, ""));
          if (normalized?.currency) result.currency = normalized.currency;
        }
        break;
      case "ending_balance":
        if (result.endingBalance == null) {
          const normalized = getNormalizedMoney(entity);
          result.endingBalance = normalized?.amount ?? parseFloat(value.replace(/[$,]/g, ""));
          if (normalized?.currency) result.currency = normalized.currency;
        }
        break;
    }
  }

  // Extract transactions from table_item entities using child properties
  let lastDate = "";

  for (const entity of document.entities) {
    if (entity.type !== "table_item") continue;

    const properties = entity.properties || [];
    const rawText = entity.mentionText?.trim().replace(/\n/g, " ") || "";

    // Extract from child properties (normalized values)
    let date = "";
    let description = "";
    let amount = 0;
    let currency = "";
    let isDeposit = false;

    for (const prop of properties) {
      const propType = prop.type || "";

      // Date (withdrawal or deposit)
      if (propType.includes("_date")) {
        const normalizedDate = getNormalizedDate(prop);
        date = normalizedDate || prop.mentionText || "";
        if (date) lastDate = date;
      }

      // Description (may have multiple parts, concatenate them)
      if (propType.includes("_description")) {
        const descPart = prop.mentionText?.trim() || "";
        if (descPart) {
          description = description ? `${description} ${descPart}` : descPart;
        }
      }

      // Amount (withdrawal or deposit)
      if (propType.includes("transaction_withdrawal") && !propType.includes("_date") && !propType.includes("_description")) {
        const normalized = getNormalizedMoney(prop);
        if (normalized) {
          amount = -Math.abs(normalized.amount); // Withdrawals are negative
          currency = normalized.currency;
        } else {
          amount = -Math.abs(parseFloat(prop.mentionText?.replace(/[$,]/g, "") || "0"));
        }
      }

      if (propType.includes("transaction_deposit") && !propType.includes("_date") && !propType.includes("_description")) {
        const normalized = getNormalizedMoney(prop);
        if (normalized) {
          amount = Math.abs(normalized.amount); // Deposits are positive
          currency = normalized.currency;
        } else {
          amount = Math.abs(parseFloat(prop.mentionText?.replace(/[$,]/g, "") || "0"));
        }
        isDeposit = true;
      }
    }

    // Fallback: if no properties, parse from mentionText (legacy behavior)
    if (properties.length === 0 && rawText) {
      const amountMatch = rawText.match(/(-?\$[\d,]+\.?\d*)$/) || rawText.match(/\s(-?[\d,]+\.\d{2})$/);
      if (amountMatch) {
        amount = parseFloat(amountMatch[1].replace(/[$,]/g, ""));
      }
    }

    // Use last known date if none found
    if (!date && lastDate) {
      date = lastDate;
    }

    // Fallback: extract description from rawText if empty or whitespace
    if ((!description || description.trim() === "") && rawText) {
      // Remove date at start, amount at end
      let fallbackDesc = rawText
        .replace(/^[A-Za-z]{3}\s+\d{1,2}\s+/, "")  // Remove "Dec 01 "
        .replace(/^\d{1,2}\/\d{1,2}\s+/, "")       // Remove "11/3 "
        .replace(/\s*-?\$?[\d,]+\.?\d*$/, "")      // Remove amount at end
        .trim();
      description = fallbackDesc;
    }

    // Clean up description
    description = description
      .replace(/\s*\.{2,}\d{4}$/, "")      // Remove card suffix "..9891"
      .replace(/\s+/g, " ")
      .replace(/^[\s\-→←↑↓<>]+/, "")
      .replace(/[\s\-→←↑↓<>]+$/, "")
      .trim();

    // Skip if no meaningful data
    if (!date && !description && amount === 0) continue;

    const transaction: Transaction = {
      date,
      description,
      amount,
      rawText,
    };

    if (currency) {
      transaction.currency = currency;
    }

    result.transactions.push(transaction);
  }

  // Clean up temporary confidence tracking fields
  delete result._accountNumberConfidence;
  delete result._clientNameConfidence;

  return result;
}

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
  console.log(`Found ${parsed.transactions.length} transactions`);
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
