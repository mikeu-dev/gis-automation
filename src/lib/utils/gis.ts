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
