import * as turf from '@turf/turf';

export const MAX_AREA_KM2 = 5; // Batas area 5 km persegi untuk versi Free

/**
 * Menghitung luas area dari GeoJSON Polygon/MultiPolygon dalam km persegi
 */
export function calculateArea(geojson: any): number {
    if (!geojson) return 0;

    // turf.area mengembalikan luas dalam meter persegi
    const areaSqMeters = turf.area(geojson);

    // Konversi ke kilometer persegi
    const areaSqKm = areaSqMeters / 1_000_000;

    return Number(areaSqKm.toFixed(4));
}

/**
 * Memformat angka luas area agar mudah dibaca
 */
export function formatArea(areaSqKm: number): string {
    if (areaSqKm < 1) {
        // Jika kurang dari 1 km2, tampilkan dalam hektar atau m2
        const hectares = areaSqKm * 100;
        return `${hectares.toFixed(2)} ha`;
    }
    return `${areaSqKm.toFixed(2)} km²`;
}

/**
 * Validasi apakah area melebihi batas yang ditentukan
 */

export function isAreaValid(areaSqKm: number): boolean {
    return areaSqKm <= MAX_AREA_KM2;
}

/**
 * Capture map canvas as Base64 string
 */
export function getMapSnapshot(map: any): string {
    return map.getCanvas().toDataURL('image/png');
}

/**
 * Menghitung total luas bangunan dalam m²
 */
export function calculateTotalBuildingArea(features: any[]): number {
    let totalArea = 0;
    features.forEach((feature) => {
        if (feature.properties?.building) {
            totalArea += turf.area(feature);
        }
    });
    return Math.round(totalArea);
}

/**
 * Menghitung total panjang jalan dalam km
 */
export function calculateTotalRoadLength(features: any[]): number {
    let totalLength = 0;
    features.forEach((feature) => {
        if (feature.properties?.highway) {
            totalLength += turf.length(feature, { units: 'kilometers' });
        }
    });
    return Number(totalLength.toFixed(2));
}

/**
 * Convert GeoJSON to CSV (Properties only)
 */
export function geojsonToCSV(geojson: any): string {
    if (!geojson || !geojson.features || geojson.features.length === 0) return '';

    const features = geojson.features;
    // Get all unique keys
    const keys = new Set<string>();
    features.forEach((f: any) => {
        Object.keys(f.properties || {}).forEach((k) => keys.add(k));
    });

    // Add lat/lon cols for Points if needed, but for now focus on properties

    const header = Array.from(keys).join(',');
    const rows = features.map((f: any) => {
        return Array.from(keys).map(key => {
            const val = f.properties[key] || '';
            // Escape quotes if needed
            return `"${String(val).replace(/"/g, '""')}"`;
        }).join(',');
    });

    return `${header}\n${rows.join('\n')}`;
}

/**
 * Convert GeoJSON to basic KML
 * Note: simplistic implementation, mainly for visualization in Google Earth
 */
export function geojsonToKML(geojson: any): string {
    const header = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>GIS Automation Export</name>`;

    const footer = `  </Document>
</kml>`;

    const placemarks = geojson.features.map((f: any) => {
        const props = f.properties || {};
        const name = props.name || props.id || 'Feature';
        let geometry = '';

        if (f.geometry.type === 'Point') {
            geometry = `<Point><coordinates>${f.geometry.coordinates[0]},${f.geometry.coordinates[1]}</coordinates></Point>`;
        } else if (f.geometry.type === 'LineString') {
            const coords = f.geometry.coordinates.map((c: any) => `${c[0]},${c[1]}`).join(' ');
            geometry = `<LineString><coordinates>${coords}</coordinates></LineString>`;
        } else if (f.geometry.type === 'Polygon') {
            // Handle simple polygon (outer ring only for simplicity or iterate rings)
            const coords = f.geometry.coordinates[0].map((c: any) => `${c[0]},${c[1]}`).join(' ');
            geometry = `<Polygon><outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
        }

        // Create description table
        let description = '<![CDATA[<table>';
        for (const [k, v] of Object.entries(props)) {
            description += `<tr><td><b>${k}</b></td><td>${v}</td></tr>`;
        }
        description += '</table>]]>';

        return `    <Placemark>
      <name>${name}</name>
      <description>${description}</description>
      ${geometry}
    </Placemark>`;
    }).join('\n');

    return `${header}\n${placemarks}\n${footer}`;
}
