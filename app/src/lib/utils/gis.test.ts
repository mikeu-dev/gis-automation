import { describe, it, expect } from 'vitest';
import { calculateTotalBuildingArea, calculateTotalRoadLength, geojsonToCSV, geojsonToKML } from './gis';

describe('GIS Utilities', () => {
    // Mock features
    const buildingFeature = {
        type: "Feature",
        properties: { building: "yes", height: 10 },
        geometry: {
            type: "Polygon",
            coordinates: [[[0, 0], [0, 0.0001], [0.0001, 0.0001], [0.0001, 0], [0, 0]]]
        }
    };

    const roadFeature = {
        type: "Feature",
        properties: { highway: "residential", name: "Main St" },
        geometry: {
            type: "LineString",
            coordinates: [[0, 0], [0, 0.01]]
        }
    };

    it('calculates total building area', () => {
        const features = [buildingFeature, roadFeature]; // Should ignore road
        const area = calculateTotalBuildingArea(features);
        expect(area).toBeGreaterThan(0);
        // Approx 11x11 meters ~ 120-130 sqm depending on lat/lon projection used by turf
    });

    it('calculates total road length', () => {
        const features = [buildingFeature, roadFeature]; // Should ignore building
        const length = calculateTotalRoadLength(features);
        expect(length).toBeGreaterThan(0);
        // 0.01 deg is roughly 1.1km lat wise
        expect(length).toBeCloseTo(1.11, 1);
    });

    it('converts geojson to CSV', () => {
        const geojson = {
            type: "FeatureCollection",
            features: [buildingFeature, roadFeature]
        };
        const csv = geojsonToCSV(geojson);
        expect(csv).toContain('building,height,highway,name'); // Header
        expect(csv).toContain('"yes","10","",""'); // Building row
        expect(csv).toContain('"","","residential","Main St"'); // Road row
    });

    it('converts geojson to KML', () => {
        const geojson = {
            type: "FeatureCollection",
            features: [buildingFeature]
        };
        const kml = geojsonToKML(geojson);
        expect(kml).toContain('<kml');
        expect(kml).toContain('<Placemark>');
        expect(kml).toContain('Feature'); // Default name as no name prop
        expect(kml).toContain('<Polygon>');
    });
});
