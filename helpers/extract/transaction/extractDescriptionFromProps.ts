import settings from "../../../settings"

export default function extractDescriptionFromProps(properties: any[]): string {
    let description = "";

    for (const prop of properties) {
        const propType = prop.type || "";
        const propConfidence = prop.confidence || 0;

        if (propConfidence < settings.MIN_PROPERTY_CONFIDENCE) continue;

        if (propType.includes("_description")) {
            const descPart = prop.mentionText?.trim() || "";
            if (descPart) {
                description = description ? `${description} ${descPart}` : descPart;
            }
        }
    }

    return description;
}
