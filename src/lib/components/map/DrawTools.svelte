<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import MapboxDraw from '@mapbox/mapbox-gl-draw';
	import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
	import type { Map, IControl } from 'maplibre-gl';

	interface Props {
		map: Map | undefined;
		onDrawUpdate?: (data: any) => void;
		onDrawCreate?: (data: any) => void;
		onDrawDelete?: (data: any) => void;
	}

	// Inline theme to ensure it's loaded properly and fixes MapLibre v5 compatibility
	const theme = [
		{
			id: 'gl-draw-line-active',
			type: 'line',
			filter: ['all', ['==', '$type', 'LineString'], ['==', 'active', 'true']],
			layout: { 'line-cap': 'round', 'line-join': 'round' },
			paint: { 'line-color': '#fbb03b', 'line-dasharray': [0.2, 2], 'line-width': 2 }
		},
		{
			id: 'gl-draw-polygon-fill-active',
			type: 'fill',
			filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'true']],
			paint: { 'fill-color': '#fbb03b', 'fill-opacity': 0.1 }
		},
		{
			id: 'gl-draw-polygon-stroke-active',
			type: 'line',
			filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'true']],
			layout: { 'line-cap': 'round', 'line-join': 'round' },
			paint: { 'line-color': '#fbb03b', 'line-dasharray': [0.2, 2], 'line-width': 2 }
		},
		{
			id: 'gl-draw-line-static',
			type: 'line',
			filter: ['all', ['==', '$type', 'LineString'], ['==', 'mode', 'static']],
			layout: { 'line-cap': 'round', 'line-join': 'round' },
			paint: { 'line-color': '#404040', 'line-width': 2 }
		},
		{
			id: 'gl-draw-polygon-fill-static',
			type: 'fill',
			filter: ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'static']],
			paint: { 'fill-color': '#404040', 'fill-opacity': 0.1 }
		},
		{
			id: 'gl-draw-polygon-stroke-static',
			type: 'line',
			filter: ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'static']],
			layout: { 'line-cap': 'round', 'line-join': 'round' },
			paint: { 'line-color': '#404040', 'line-width': 2 }
		},
		{
			id: 'gl-draw-polygon-and-line-vertex-active',
			type: 'circle',
			filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
			paint: { 'circle-radius': 5, 'circle-color': '#fbb03b' }
		}
	];

	let { map, onDrawUpdate, onDrawCreate, onDrawDelete }: Props = $props();
	let draw: any; // Type 'any' used because @mapbox/mapbox-gl-draw types might not be perfectly aligned with maplibre

	$effect(() => {
		if (map && !draw) {
			draw = new MapboxDraw({
				displayControlsDefault: false,
				controls: {
					polygon: true,
					trash: true
				},
				defaultMode: 'draw_polygon',
				styles: theme
			});

			// Add the draw control to the map
			map.addControl(draw as unknown as IControl, 'top-left');

			// Check if map 'on' method is available and we haven't already attached listeners
			// Note: ensure we don't attach multiple times if effect re-runs

			map.on('draw.create', (e: any) => {
				if (onDrawCreate) onDrawCreate(e.features[0]);
			});

			map.on('draw.update', (e: any) => {
				if (onDrawUpdate) onDrawUpdate(e.features[0]);
			});

			map.on('draw.delete', (e: any) => {
				if (onDrawDelete) onDrawDelete(e);
			});
		}
	});

	onDestroy(() => {
		if (map && draw) {
			try {
				map.removeControl(draw as unknown as IControl);
			} catch (e) {
				console.warn('Error removing draw control', e);
			}
		}
	});

	export function deleteAll() {
		if (draw) {
			draw.deleteAll();
		}
	}

	export function getAll() {
		return draw ? draw.getAll() : null;
	}

	export function changeMode(mode: string, options?: any) {
		if (draw) {
			draw.changeMode(mode, options);
		}
	}
</script>

<!-- No visible UI, just attaches control to map -->
