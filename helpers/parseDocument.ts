import * as fs from "fs";
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import getMimeType from "../helpers/getMimeType"
import settings from "../settings"

export default async function parseDocument(filePath: string) {
    if (!settings.PROJECT_ID || !settings.PROCESSOR_ID) {
        throw new Error(
            "Missing required environment variables: GOOGLE_CLOUD_PROJECT and GOOGLE_DOC_AI_PROCESSOR_ID"
        );
    }

    const client = new DocumentProcessorServiceClient();

    const fileBuffer = fs.readFileSync(filePath);
    const encodedFile = fileBuffer.toString("base64");

    const request = {
        name: `projects/${settings.PROJECT_ID}/locations/${settings.LOCATION}/processors/${settings.PROCESSOR_ID}`,
        rawDocument: {
            content: encodedFile,
            mimeType: getMimeType(filePath),
        },
    };

    const [result] = await client.processDocument(request);
    return result.document;
}