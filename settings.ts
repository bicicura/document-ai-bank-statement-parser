export default {
    PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT,
    LOCATION: process.env.GOOGLE_DOC_AI_LOCATION || "us",
    PROCESSOR_ID: process.env.GOOGLE_DOC_AI_PROCESSOR_ID,
    MIN_PROPERTY_CONFIDENCE: 0.1, // Minimum confidence threshold for transaction properties. Properties below this are likely garbage (section headers, check images, etc.)
}