# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PoC for parsing bank statements (PDF/images) using Google Document AI to extract transactions into JSON.

## Build & Run Commands

```bash
# Install dependencies
npm install @google-cloud/documentai

# Set required environment variables
export GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
export GOOGLE_CLOUD_PROJECT=my-project-id
export GOOGLE_DOC_AI_PROCESSOR_ID=abc123

# Run the parser
npx ts-node scripts/poc-google-doc-ai.ts input/bank-statement.pdf
```

## Architecture

- `scripts/poc-google-doc-ai.ts` - Main script that processes documents via Google Document AI
- `input/` - Place bank statements here (PDF, PNG, JPG)
- `output/parsed-result.json` - Extracted transaction data with raw API response

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON key |
| `GOOGLE_CLOUD_PROJECT` | Google Cloud project ID |
| `GOOGLE_DOC_AI_PROCESSOR_ID` | Document AI processor ID |
