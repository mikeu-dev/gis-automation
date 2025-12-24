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
			zoom: 12
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
</style>
