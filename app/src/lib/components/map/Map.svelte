<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';

	let mapContainer: HTMLDivElement;
	let map: maplibregl.Map;

	interface Props {
		onLoad?: (map: maplibregl.Map) => void;
	}

	let { onLoad }: Props = $props();

	onMount(() => {
		map = new maplibregl.Map({
			container: mapContainer,
			style: 'https://tiles.openfreemap.org/styles/liberty', // Free open source style
			center: [106.8456, -6.2088], // Jakarta coordinates
			zoom: 12,
			preserveDrawingBuffer: true
		});

		map.addControl(new maplibregl.NavigationControl(), 'top-right');
		map.addControl(
			new maplibregl.GeolocateControl({
				positionOptions: {
					enableHighAccuracy: true
				},
				trackUserLocation: true
			})
		);

		map.on('load', () => {
			if (onLoad) onLoad(map);
		});
	});

	onDestroy(() => {
		if (map) map.remove();
	});
</script>

<div class="h-full min-h-[500px] w-full" bind:this={mapContainer}></div>

<style>
	:global(.maplibregl-ctrl-group) {
		background-color: white;
		border-radius: 0.5rem;
		overflow: hidden;
		box-shadow:
			0 4px 6px -1px rgb(0 0 0 / 0.1),
			0 2px 4px -2px rgb(0 0 0 / 0.1);
	}

	/* FIX: Force styling for mapbox-gl-draw controls which might be losing styles or z-index */
	:global(.mapboxgl-ctrl-group) {
		background-color: white;
		border-radius: 0.5rem;
		overflow: hidden;
		box-shadow:
			0 4px 6px -1px rgb(0 0 0 / 0.1),
			0 2px 4px -2px rgb(0 0 0 / 0.1);
		margin: 10px;
		z-index: 50 !important; /* Ensure it's above the map canvas */
		position: relative; /* Ensure z-index works */
		display: flex; /* Fix layout if collapsed */
		flex-direction: column;
	}

	:global(.mapboxgl-ctrl-group > button) {
		width: 32px;
		height: 32px;
		display: block;
		padding: 0;
		outline: none;
		border: 0;
		box-sizing: border-box;
		background-color: transparent;
		cursor: pointer;
		border-bottom: 1px solid #eee;
	}

	:global(.mapboxgl-ctrl-group > button:last-child) {
		border-bottom: none;
	}

	/* Ensure icons in draw tools are visible */
	:global(.mapbox-gl-draw_ctrl-draw-btn) {
		background-repeat: no-repeat;
		background-position: center;
	}
</style>
