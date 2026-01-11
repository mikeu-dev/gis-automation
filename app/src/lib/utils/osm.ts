import osmtogeojson from 'osmtogeojson';
import * as turf from '@turf/turf';

/**
 * Mengambil data OSM (Building & Highway) berdasarkan GeoJSON Polygon
 */
export async function fetchOSMData(polygonGeoJSON: any) {
    try {
        // 1. Handle Feature vs FeatureCollection
        let polygons = [];
        if (polygonGeoJSON.type === 'FeatureCollection') {
            polygons = polygonGeoJSON.features;
        } else {
            polygons = [polygonGeoJSON];
        }

        // 2. Build Query Parts for each polygon
        // We will use a union query for all polygons
        let queryBody = '';

        for (const polygon of polygons) {
            const coordinates = polygon.geometry.coordinates[0];
            const polyString = coordinates.map((coord: number[]) => `${coord[1]} ${coord[0]}`).join(' ');

            queryBody += `
                way["building"](poly:"${polyString}");
                relation["building"](poly:"${polyString}");
                way["highway"](poly:"${polyString}");
                
                // New Layers for Phase 3
                way["landuse"](poly:"${polyString}");
                relation["landuse"](poly:"${polyString}");
                way["leisure"](poly:"${polyString}");
                relation["leisure"](poly:"${polyString}");
                way["natural"](poly:"${polyString}");
                relation["natural"](poly:"${polyString}");
            `;
        }

        // 3. Construct Final Query
        const query = `
            [out:json][timeout:25];
            (
                ${queryBody}
            );
            out geom;
        `;

        // 3. Fetch from Overpass API (Alternative Instance - Kumi Systems)
        // Main instance (overpass-api.de) often timeouts
        const response = await fetch('https://overpass.kumi.systems/api/interpreter', {
            method: 'POST',
            body: query
        });

        if (!response.ok) {
            throw new Error(`Overpass API Error: ${response.statusText}`);
        }

        const data = await response.json();

        // 4. Convert to GeoJSON using osmtogeojson
        const resultGeoJSON = osmtogeojson(data);

        return resultGeoJSON;

    } catch (error) {
        console.error('Failed to fetch OSM data:', error);
        throw error;
    }
}
