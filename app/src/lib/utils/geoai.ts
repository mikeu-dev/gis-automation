/**
 * Utility to communicate with the local GeoAI Python Service.
 */

const GEOAI_SERVICE_URL = 'http://localhost:5000/analyze';

/**
 * Sends a map snapshot to the local GeoAI service for analysis.
 * @param imageBase64 Base64 string of the map screenshot 
 * @param context Optional additional context or prompt
 */
export async function analyzeMapWithGeoAI(
    imageBase64: string,
    context: any = {}
) {
    try {
        // Ensure the base64 string is cleaned if necessary, though the service can handle it too
        // But keeping it consistent with previous implementation
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const response = await fetch(GEOAI_SERVICE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: cleanBase64,
                context: context
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Service returned ${response.status}`);
        }

        const data = await response.json();
        return data.text; // Return the text description for now to match interface

    } catch (error) {
        console.error('GeoAI Service Error:', error);
        throw error;
    }
}
