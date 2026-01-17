# Bank Statement Parser

Parse bank statements (PDF/images) using Google Document AI and extract transactions into structured JSON.

## Features

- Extracts metadata: bank name, account number, client info, statement period
- Extracts all transactions with dates, descriptions, and amounts
- Handles check images (Eastern Bank, Citizens Bank patterns)
- Calculates totals and balance changes
- Outputs structured JSON with raw API response

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Google Cloud

You need a Google Cloud project with Document AI API enabled and a Bank Statement Parser processor.

Set environment variables:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=./your-credentials.json
export GOOGLE_CLOUD_PROJECT=your-project-id
export GOOGLE_DOC_AI_PROCESSOR_ID=your-processor-id
```

## Usage

```bash
npx ts-node app.ts input/bank-statement.pdf
```

Output is saved to:
- `output/parsed-result.json` - Extracted data
- `output/raw-response.json` - Raw API response

## Output Structure

```json
{
  "bank": {
    "name": "Citizens Bank",
    "address": "..."
  },
  "client": {
    "name": "John Doe",
    "address": "..."
  },
  "account": {
    "number": "XXXXXX-257-5",
    "type": "Checking"
  },
  "statementPeriod": {
    "start": "2025-02-14",
    "end": "2025-03-13"
  },
  "balance": {
    "start": 10000.00,
    "end": 9500.00,
    "change": -500.00
  },
  "transactions": {
    "items": [
      {
        "date": "2025-03-01",
        "description": "PAYROLL DEPOSIT",
        "amount": 2500.00
      },
      {
        "date": "2025-03-05",
        "description": "Check #1234",
        "amount": -500.00,
        "checkNumber": "1234"
      }
    ],
    "totals": {
      "positive": 2500.00,
      "negative": -500.00,
      "net": 2000.00
    }
  }
}
```

## Project Structure

```
├── app.ts                 # Main entry point
├── types.ts               # TypeScript type definitions
├── settings.ts            # Configuration
├── helpers/
│   ├── parseDocument.ts   # Google Document AI API call
│   ├── saveResult.ts      # Save output to files
│   ├── getMimeType.ts     # File type detection
│   └── extract/
│       ├── index.ts       # Main extraction orchestrator
│       ├── getMetadata.ts # Extract bank/client/account info
│       ├── getTransactions.ts # Extract transactions
│       ├── getChecks.ts   # Extract checks from raw text
│       └── transaction/   # Transaction parsing helpers
├── input/                 # Place bank statements here
├── output/                # Parsed results
└── docs/                  # Documentation
```

## Documentation

- [Google Document AI Entities](docs/google-doc-ai-entities.md) - Entity types and structure

## Limitations

- Maximum 15 pages per document (30 in imageless mode)
- Some bank formats may require additional parsing patterns
