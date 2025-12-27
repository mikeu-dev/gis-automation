import { json } from '@sveltejs/kit';
import { analyzeMapWithGeoAI } from '$lib/utils/geoai';

export async function POST({ request }) {
    try {
        const { image, context } = await request.json();

        if (!image) {
            return json({ error: 'Image data missing' }, { status: 400 });
        }

        const responseText = await analyzeMapWithGeoAI(image, context);

        return json({ text: responseText });
    } catch (error) {
        console.error('API Error:', error);
        return json({ error: (error as any).message || 'Failed to process AI request' }, { status: 500 });
    }
}
