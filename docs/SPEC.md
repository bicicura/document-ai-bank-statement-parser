# PoC: Google Document AI - Bank Statement Parser

## Objetivo
Crear un script que tome un bank statement (PDF/imagen) y extraiga transacciones usando Google Document AI, guardando el resultado en un archivo JSON.

## Setup Google Cloud

1. Crear proyecto en Google Cloud Console
2. Habilitar **Document AI API**
3. Crear un **Processor** tipo "Bank Statement Parser" (o "Form Parser" si no está disponible)
4. Descargar service account key JSON
5. Setear variable de entorno: `GOOGLE_APPLICATION_CREDENTIALS=path/to/key.json`

## Input
- Archivo: `input/bank-statement.pdf` (o .png, .jpg)

## Output
- Archivo: `output/parsed-result.json` con estructura:
```json
{
"accountNumber": "****1234",
"bankName": "Chase Bank",
"statementPeriod": {
    "start": "2024-01-01",
    "end": "2024-01-31"
},
"transactions": [
    {
    "date": "2024-01-05",
    "description": "AMAZON PURCHASE",
    "amount": -49.99,
    "balance": 1250.01
    }
],
"rawResponse": { /* Google's full response */ }
}

Implementación

Crear script scripts/poc-google-doc-ai.ts:

import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;
const LOCATION = 'us'; // or 'eu'
const PROCESSOR_ID = process.env.GOOGLE_DOC_AI_PROCESSOR_ID;

async function parseDocument(filePath: string) {
const client = new DocumentProcessorServiceClient();

const fileBuffer = fs.readFileSync(filePath);
const encodedFile = fileBuffer.toString('base64');

const request = {
    name: `projects/${PROJECT_ID}/locations/${LOCATION}/processors/${PROCESSOR_ID}`,
    rawDocument: {
    content: encodedFile,
    mimeType: 'application/pdf', // or 'image/png', 'image/jpeg'
    },
};

const [result] = await client.processDocument(request);
return result.document;
}

async function main() {
const inputFile = process.argv[2] || 'input/bank-statement.pdf';

console.log(`Processing: ${inputFile}`);
const document = await parseDocument(inputFile);

// Save raw response
const outputPath = 'output/parsed-result.json';
fs.mkdirSync('output', { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));

console.log(`Result saved to: ${outputPath}`);
}

main().catch(console.error);

Dependencias

npm install @google-cloud/documentai

Ejecución

# Setear credenciales
export GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
export GOOGLE_CLOUD_PROJECT=my-project-id
export GOOGLE_DOC_AI_PROCESSOR_ID=abc123

# Correr script
npx ts-node scripts/poc-google-doc-ai.ts input/bank-statement.pdf