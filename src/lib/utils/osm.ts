import osmtogeojson from 'osmtogeojson';
import * as turf from '@turf/turf';

/**
 * Mengambil data OSM (Building & Highway) berdasarkan GeoJSON Polygon
 */
export async function fetchOSMData(polygonGeoJSON: any) {
    try {
        // 1. Convert Polygon to Overpass Poly string
        // Koordinat di GeoJSON: [lon, lat]. Overpass butuh: "lat lon"
        const coordinates = polygonGeoJSON.geometry.coordinates[0];
        const polyString = coordinates.map((coord: number[]) => `${coord[1]} ${coord[0]}`).join(' ');

        // 2. Construct Query
        // Kita mengambil building (gedung) dan highway (jalan) di dalam polygon
        // Timeout 25 detik
        const query = `
            [out:json][timeout:25];
            (
              way["building"](poly:"${polyString}");
              relation["building"](poly:"${polyString}");
              way["highway"](poly:"${polyString}");
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
