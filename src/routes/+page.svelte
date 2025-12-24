<script lang="ts">
	import Map from '$lib/components/map/Map.svelte';
	import DrawTools from '$lib/components/map/DrawTools.svelte';
	import { calculateArea, formatArea, isAreaValid, MAX_AREA_KM2 } from '$lib/utils/gis';
	import { Loader2, AlertCircle, CheckCircle } from 'lucide-svelte';
	import type { Map as MapLibreMap } from 'maplibre-gl';

	let mapInstance = $state<MapLibreMap | undefined>(undefined);
	let currentArea = $state<number>(0);
	let currentFeature = $state<any>(null);
	let isProcessing = $state(false);

	// Derived state
	let isValidSize = $derived(isAreaValid(currentArea));
	let areaDisplay = $derived(formatArea(currentArea));

	// Component reference
	let drawToolsComponent = $state<any>(null);

	function handleMapLoad(map: MapLibreMap) {
		mapInstance = map;
		console.log('Map loaded');
	}

	// Consolidated handler for all draw events (create, update, delete)
	// We recalculate state based on ALL current features to ensure sync.
	function updateMapState() {
		if (!drawToolsComponent) return;

		const allFeatures = drawToolsComponent.getAll();

		if (!allFeatures || allFeatures.features.length === 0) {
			currentArea = 0;
			currentFeature = null;
			return;
		}

		// For this MVP, we consider the combined area of all polygons
		// Or we could enforce single polygon. Let's calculate total area.
		let totalArea = 0;
		// Search for the last modified feature to set as 'current' (or just use the collection)
		const collection = {
			type: 'FeatureCollection',
			features: allFeatures.features
		};

		totalArea = calculateArea(collection);

		currentArea = totalArea;
		currentFeature = collection; // Store the whole collection
	}

	function handleDrawCreate() {
		// Optional: Enforce single polygon by deleting others if needed
		// For now, just update state
		updateMapState();
	}

	function handleDrawUpdate() {
		updateMapState();
	}

	function handleDrawDelete() {
		console.log('Delete event detected');
		// Small timeout to allow draw internals to update
		setTimeout(() => {
			updateMapState();
		}, 10);
	}

	async function startMapping() {
		if (!isValidSize || !currentFeature || !mapInstance) return;
		isProcessing = true;

		try {
			// 1. Fetch Data Real-time
			const result = await fetchOSMData(currentFeature.features[0]); // Assuming single polygon for MVP

			if (result.features.length === 0) {
				alert('Tidak ditemukan data (gedung/jalan) di area ini.');
				isProcessing = false;
				return;
			}

			// 2. Add Source & Layers to Map
			const sourceId = 'generated-osm-data';

			// Clean up previous result if exists
			if (mapInstance.getSource(sourceId)) {
				// Remove layers first
				generatedLayerIds.forEach((id) => {
					if (mapInstance && mapInstance.getLayer(id)) mapInstance.removeLayer(id);
				});
				mapInstance.removeSource(sourceId);
				generatedLayerIds = [];
			}

			mapInstance.addSource(sourceId, {
				type: 'geojson',
				data: result
			});

			// Layer: Buildings (3D Extrusion Effect)
			mapInstance.addLayer({
				id: 'generated-buildings-3d',
				type: 'fill-extrusion',
				source: sourceId,
				filter: ['has', 'building'],
				paint: {
					'fill-extrusion-color': '#2563eb', // Blueish
					'fill-extrusion-height': [
						'interpolate',
						['linear'],
						['zoom'],
						15,
						0,
						15.05,
						['get', 'height'] // Use 'height' tag if avail, else minimal
					],
					// Fallback height simulation if 'height' tag missing
					'fill-extrusion-base': 0,
					'fill-extrusion-opacity': 0.8
				}
			});
			generatedLayerIds.push('generated-buildings-3d');

			// Layer: Roads (Lines)
			mapInstance.addLayer({
				id: 'generated-roads',
				type: 'line',
				source: sourceId,
				filter: ['has', 'highway'],
				paint: {
					'line-color': '#f59e0b', // Amber/Orange
					'line-width': 2
				}
			});
			generatedLayerIds.push('generated-roads');

			// Hide Draw Control temporarily to visualize result better?
			// Or keep it. Let's keep it.
		} catch (error) {
			console.error(error);
			alert('Gagal mengambil data mapping. Coba area yang lebih kecil atau coba lagi nanti.');
		} finally {
			isProcessing = false;
		}
	}

	function resetMap() {
		// Clean up generated layers
		if (mapInstance) {
			generatedLayerIds.forEach((id) => {
				if (mapInstance && mapInstance.getLayer(id)) mapInstance.removeLayer(id);
			});
			const sourceId = 'generated-osm-data';
			if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId);
			generatedLayerIds = [];
		}

		if (drawToolsComponent) {
			drawToolsComponent.deleteAll();
			// Force switch back to draw mode for better UX
			drawToolsComponent.changeMode('draw_polygon');
		}
		currentArea = 0;
		currentFeature = null;
		isProcessing = false;
	}
</script>

<div class="flex h-screen w-full overflow-hidden bg-gray-50">
	<!-- Sidebar -->
	<aside class="z-10 flex w-80 flex-col border-r bg-white shadow-lg">
		<div class="border-b p-6">
			<h1 class="text-xl font-bold text-gray-800">GIS Automation</h1>
			<p class="text-sm text-gray-500">Web Mapping Tool</p>
		</div>

		<div class="flex-1 overflow-y-auto p-6">
			<div class="space-y-6">
				<!-- Area Stats -->
				<div class="rounded-xl border bg-gray-50 p-4">
					<h3 class="mb-2 text-sm font-semibold text-gray-600">Selected Area</h3>
					<div class="flex items-end justify-between">
						<span class="text-3xl font-bold text-gray-900">{areaDisplay}</span>
					</div>
					<div class="mt-2 text-xs">
						Max Area: <span class="font-medium">{MAX_AREA_KM2} km²</span> (Free Tier)
					</div>
				</div>

				<!-- Validation Status -->
				{#if currentArea > 0}
					<div
						class="flex items-center gap-3 rounded-lg border p-3 {isValidSize
							? 'border-green-200 bg-green-50 text-green-700'
							: 'border-red-200 bg-red-50 text-red-700'}"
					>
						{#if isValidSize}
							<CheckCircle class="h-5 w-5" />
							<span class="text-sm font-medium">Area Valid</span>
						{:else}
							<AlertCircle class="h-5 w-5" />
							<span class="text-sm font-medium">Area Too Large</span>
						{/if}
					</div>
				{/if}

				<!-- Instructions -->
				{#if currentArea === 0}
					<div class="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
						<p>Use the Draw Tool (top-left on map) to draw a polygon area that you want to map.</p>
					</div>
				{/if}
			</div>
		</div>

		<div class="border-t p-6">
			<div class="flex gap-2">
				<button
					onclick={resetMap}
					class="mb-0 flex w-1/3 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-3 font-semibold text-gray-700 transition-all hover:bg-gray-50"
				>
					Reset
				</button>
				<button
					onclick={startMapping}
					disabled={!isValidSize || currentArea === 0 || isProcessing}
					class="flex flex-1 items-center justify-center gap-2 rounded-lg py-3 font-semibold text-white transition-all
                    {isValidSize && currentArea > 0 && !isProcessing
						? 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
						: 'cursor-not-allowed bg-gray-300'}"
				>
					{#if isProcessing}
						<Loader2 class="h-5 w-5 animate-spin" />
						Processing...
					{:else}
						Generate Mapping
					{/if}
				</button>
			</div>
		</div>
	</aside>

	<!-- Main Map Area -->
	<main class="relative flex-1">
		<Map onLoad={handleMapLoad} />
		{#if mapInstance}
			<DrawTools
				bind:this={drawToolsComponent}
				map={mapInstance}
				onDrawCreate={handleDrawCreate}
				onDrawUpdate={handleDrawUpdate}
				onDrawDelete={handleDrawDelete}
			/>
		{/if}
	</main>
</div>
