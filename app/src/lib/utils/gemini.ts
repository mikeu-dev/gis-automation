import { GoogleGenAI } from '@google/genai';

/**
 * Initializes the Gemini AI model with the provided API Key.
 */
export function getGeminiClient(apiKey: string) {
    return new GoogleGenAI({ apiKey, apiVersion: 'v1' });
}

/**
 * Analyzes a map snapshot and current GeoJSON to suggest improvements.
 * @param apiKey User's API Key
 * @param imageBase64 Base64 string of the map screenshot 
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
        const client = getGeminiClient(apiKey);

        // Remove header if present
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

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

        const response = await client.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [
                {
                    parts: [
                        { text: finalPrompt },
                        {
                            inlineData: {
                                mimeType: 'image/png',
                                data: cleanBase64
                            }
                        }
                    ]
                }
            ]
        });

        return response.text();

    } catch (error) {
        console.error('Gemini API Error:', error);
        throw error;
    }
}
