import { json } from '@sveltejs/kit';
import { analyzeMapWithAI } from '$lib/utils/gemini';
import { GEMINI_API_KEY } from '$env/static/private';

export async function POST({ request }) {
    if (!GEMINI_API_KEY) {
        return json({ error: 'Server configuration error: API Key missing' }, { status: 500 });
    }

    try {
        const { image, context } = await request.json();

        if (!image) {
            return json({ error: 'Image data missing' }, { status: 400 });
        }

        const responseText = await analyzeMapWithAI(GEMINI_API_KEY, image, context);

        return json({ text: responseText });
    } catch (error) {
        console.error('API Error:', error);
        return json({ error: 'Failed to process AI request' }, { status: 500 });
    }
}
