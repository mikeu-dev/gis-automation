import { json } from '@sveltejs/kit';
// import { analyzeMapWithGeoAI } from '$lib/utils/geoai'; // Disabled

export async function POST({ request }) {
    // AI Analysis feature has been disabled
    return json({
        error: 'AI Analysis feature is currently disabled'
    }, {
        status: 503
    });
}
