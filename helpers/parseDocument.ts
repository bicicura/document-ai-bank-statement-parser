import * as fs from "fs";
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import getMimeType from "./getMimeType"
import settings from "../settings"
import { Document } from "../types"

export default async function parseDocument(filePath: string): Promise<Document | null | undefined> {
    if (!settings.PROJECT_ID || !settings.PROCESSOR_ID) {
        throw new Error(
            "Missing required environment variables: GOOGLE_CLOUD_PROJECT and GOOGLE_DOC_AI_PROCESSOR_ID"
        );
    }

    const client = new DocumentProcessorServiceClient();

    const fileBuffer = fs.readFileSync(filePath);
    const encodedFile = fileBuffer.toString("base64");

    // Use specific processor version if set, otherwise use default
    const processorVersion = settings.PROCESSOR_VERSION;
    const processorPath = processorVersion
        ? `projects/${settings.PROJECT_ID}/locations/${settings.LOCATION}/processors/${settings.PROCESSOR_ID}/processorVersions/${processorVersion}`
        : `projects/${settings.PROJECT_ID}/locations/${settings.LOCATION}/processors/${settings.PROCESSOR_ID}`;

    const request = {
        name: processorPath,
        rawDocument: {
            content: encodedFile,
            mimeType: getMimeType(filePath),
        },
    };

    const [result] = await client.processDocument(request);
    return result.document;
}