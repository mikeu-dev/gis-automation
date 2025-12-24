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
				defaultMode: 'draw_polygon'
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
</script>

<!-- No visible UI, just attaches control to map -->
