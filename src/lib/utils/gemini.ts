import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Initializes the Gemini AI model with the provided API Key.
 */
export function getGeminiModel(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use the gemini-pro-vision model (or gemini-1.5-flash which is multimodal and fast)
    // For image + text, we typically use a multimodal model.
    return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
}

/**
 * Analyzes a map snapshot and current GeoJSON to suggest improvements.
 * @param apiKey User's API Key
 * @param imageBase64 Base64 string of the map screenshot (without data:image/png;base64 prefix preferably, or handle it)
 * @param currentGeoJSON The current GeoJSON features
 * @param promptText Optional custom prompt
 */
export async function analyzeMapWithAI(
    apiKey: string,
    imageBase64: string,
    currentGeoJSON: any,
    promptText: string = ''
) {
    try {
        const model = getGeminiModel(apiKey);

        // Sanitize Base64 if needed
        const imagePart = {
            inlineData: {
                data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
                mimeType: 'image/png',
            },
        };

        const defaultPrompt = `
You are a GIS expert. I will provide you with a satellite map image and the corresponding GeoJSON data (in JSON format) that represents the currently mapped features (buildings, roads).

Current GeoJSON Summary:
- Number of features: ${currentGeoJSON?.features?.length || 0}
- Types: ${currentGeoJSON?.features?.map((f: any) => f.geometry.type).join(', ').slice(0, 100)}...

Task:
1. Analyze the satellite image.
2. Compare it with the provided GeoJSON data context.
3. Identify missing buildings or roads, or inaccuracies.
4. Provide a structured suggestion or specific areas that need attention.
5. If possible, generate valid GeoJSON features for missing items (approximate).

Return your response in Markdown.
`;

        const finalPrompt = promptText || defaultPrompt;

        const result = await model.generateContent([finalPrompt, imagePart]);
        const response = await result.response;
        return response.text();

    } catch (error) {
        console.error('Gemini API Error:', error);
        throw new Error('Failed to analyze map with AI.');
    }
}
