import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import settings from "../settings";

export type ProcessorInfo = {
    name: string;
    displayName: string;
    type: string;
    defaultVersionId: string;
    availableVersions: string[];
}

export default async function getProcessorInfo(): Promise<ProcessorInfo | null> {
    if (!settings.PROJECT_ID || !settings.PROCESSOR_ID) {
        return null;
    }

    const client = new DocumentProcessorServiceClient();
    const processorName = `projects/${settings.PROJECT_ID}/locations/${settings.LOCATION}/processors/${settings.PROCESSOR_ID}`;

    try {
        // Get processor details
        const [processor] = await client.getProcessor({ name: processorName });

        // List available versions
        const [versions] = await client.listProcessorVersions({
            parent: processorName,
        });

        const availableVersions = versions.map(v => {
            const versionId = v.name?.split('/').pop() || '';
            const displayName = v.displayName || '';
            return `${versionId} (${displayName})`;
        });

        // Get default version ID
        const defaultVersionId = processor.defaultProcessorVersion?.split('/').pop() || 'unknown';

        return {
            name: processor.name || '',
            displayName: processor.displayName || '',
            type: processor.type || '',
            defaultVersionId,
            availableVersions,
        };
    } catch (error) {
        console.error("Error getting processor info:", error);
        return null;
    }
}
