export default {
    PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT,
    LOCATION: process.env.GOOGLE_DOC_AI_LOCATION || "us",
    PROCESSOR_ID: process.env.GOOGLE_DOC_AI_PROCESSOR_ID,
    PROCESSOR_VERSION: process.env.GOOGLE_DOC_AI_PROCESSOR_VERSION, // Optional: specific processor version (e.g., "pretrained-bankstatement-v5.0-2023-12-06")
    MIN_PROPERTY_CONFIDENCE: 0.1, // Minimum confidence threshold for transaction properties. Properties below this are likely garbage (section headers, check images, etc.)
}