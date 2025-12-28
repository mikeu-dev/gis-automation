<script lang="ts">
	import Map from '$lib/components/map/Map.svelte';
	import DrawTools from '$lib/components/map/DrawTools.svelte';
	import {
		calculateArea,
		formatArea,
		isAreaValid,
		MAX_AREA_KM2,
		getMapSnapshot
	} from '$lib/utils/gis';
	import { fetchOSMData } from '$lib/utils/osm';
	// import { analyzeMapWithAI } from '$lib/utils/gemini'; // Now handled server-side
	import { Loader2, AlertCircle, CheckCircle, Layers, Edit3, Bot, Save } from 'lucide-svelte';
	import maplibregl from 'maplibre-gl';
	import type { Map as MapLibreMap } from 'maplibre-gl';

	let mapInstance = $state<MapLibreMap | undefined>(undefined);
	let currentArea = $state<number>(0);
	let currentFeature = $state<any>(null);
	let isProcessing = $state(false);

	// AIS State
	let showSatellite = $state(false);
	// isTrainingOpen removed
	let aiAnalyzing = $state(false);
	let aiResponse = $state('');
	let aiAnalysisTimer = $state<number | undefined>(undefined);
	let aiTimeElapsed = $state('0:00');
	let aiStatusMessage = $state('AI Analyzing Map...');

	// Derived state
	let isValidSize = $derived(isAreaValid(currentArea));
	let areaDisplay = $derived(formatArea(currentArea));

	// Component reference
	let drawToolsComponent = $state<any>(null);

	// Store generated layers to manage cleanup
	let generatedLayerIds: string[] = [];

	// Result State
	let mappingResult = $state<any>(null);
	let stats = $state({ buildings: 0, roads: 0 });

	function handleMapLoad(map: MapLibreMap) {
		mapInstance = map;
		console.log('Map loaded');

		// Add Satellite Source (Esri World Imagery)
		map.addSource('satellite-source', {
			type: 'raster',
			tiles: [
				'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
			],
			tileSize: 256,
			attribution: 'Esri, Maxar, Earthstar Geographics, and the GIS User Community'
		});

		// Add Satellite Layer (Hidden by default)
		map.addLayer(
			{
				id: 'satellite-layer',
				type: 'raster',
				source: 'satellite-source',
				layout: {
					visibility: 'none'
				},
				paint: {}
			},
			'generated-buildings-3d'
		);

		setupMapInteractions(map);
	}

	function toggleSatellite() {
		if (!mapInstance) return;
		showSatellite = !showSatellite;
		const visibility = showSatellite ? 'visible' : 'none';
		if (mapInstance.getLayer('satellite-layer')) {
			mapInstance.setLayoutProperty('satellite-layer', 'visibility', visibility);
		}
	}

	function setupMapInteractions(map: MapLibreMap) {
		// Handle Click for Popups
		map.on('click', (e) => {
			if (generatedLayerIds.length === 0) return;

			// Query our generated layers
			const features = map.queryRenderedFeatures(e.point, { layers: generatedLayerIds });

			if (features.length > 0) {
				const feature = features[0];
				const props = feature.properties || {};

				// Create HTML Table for properties
				let html =
					'<div class="p-2 text-sm"><h4 class="font-bold mb-2 border-b pb-1">Feature Details</h4><table class="w-full text-left">';
				for (const [key, value] of Object.entries(props)) {
					html += `<tr class="border-b border-gray-100 last:border-0">
                        <td class="pr-3 py-1 text-gray-500 font-medium">${key}</td>
                        <td class="py-1 text-gray-800 break-words">${value}</td>
                    </tr>`;
				}
				html += '</table></div>';

				new maplibregl.Popup({ maxWidth: '300px' }).setLngLat(e.lngLat).setHTML(html).addTo(map);
			}
		});

		// Handle Mouse Cursor (Pointer on hover)
		map.on('mousemove', (e) => {
			if (generatedLayerIds.length === 0) {
				map.getCanvas().style.cursor = '';
				return;
			}

			const features = map.queryRenderedFeatures(e.point, { layers: generatedLayerIds });
			if (features.length > 0) {
				map.getCanvas().style.cursor = 'pointer';
			} else {
				map.getCanvas().style.cursor = '';
			}
		});
	}

	function updateMapState() {
		if (!drawToolsComponent) return;

		const allFeatures = drawToolsComponent.getAll();

		if (!allFeatures || allFeatures.features.length === 0) {
			currentArea = 0;
			currentFeature = null;
			return;
		}

		let totalArea = 0;
		const collection = {
			type: 'FeatureCollection',
			features: allFeatures.features
		};

		totalArea = calculateArea(collection);

		currentArea = totalArea;
		currentFeature = collection;
	}

	function handleDrawCreate() {
		updateMapState();
	}

	function handleDrawUpdate() {
		updateMapState();
	}

	function handleDrawDelete() {
		setTimeout(() => {
			updateMapState();
		}, 10);
	}

	async function startMapping() {
		if (!isValidSize || !currentFeature || !mapInstance) return;
		isProcessing = true;
		aiResponse = '';

		try {
			// 1. Fetch Data Real-time
			const result = await fetchOSMData(currentFeature.features[0]);

			if (result.features.length === 0) {
				alert('Tidak ditemukan data (gedung/jalan) di area ini.');
				isProcessing = false;
				return;
			}

			// Store result
			mappingResult = result;

			// Calculate Stats
			const buildings = result.features.filter((f: any) => f.properties.building).length;
			const roads = result.features.filter((f: any) => f.properties.highway).length;
			stats = { buildings, roads };

			// 2. Add Source & Layers to Map
			const sourceId = 'generated-osm-data';

			if (mapInstance.getSource(sourceId)) {
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
					'fill-extrusion-color': '#2563eb',
					'fill-extrusion-height': [
						'case',
						['has', 'height'],
						['to-number', ['get', 'height']],
						['has', 'building:levels'],
						['*', 3, ['to-number', ['get', 'building:levels']]],
						10
					],
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
					'line-color': '#f59e0b',
					'line-width': 2
				}
			});
			generatedLayerIds.push('generated-roads');

			// 3. Auto-Run AI Analysis
			// Open the panel so user sees it happening
			// isTrainingOpen removed

			// Small delay to ensure layers are rendered on canvas before snapshot
			setTimeout(() => {
				runGeminiAnalysis();
			}, 1000);
		} catch (error) {
			console.error(error);
			alert('Gagal mengambil data mapping. Coba area yang lebih kecil atau coba lagi nanti.');
		} finally {
			isProcessing = false;
		}
	}

	function handleEditMode() {
		if (!mappingResult || !drawToolsComponent || !mapInstance) return;

		const features = mappingResult.features;

		try {
			drawToolsComponent.add(mappingResult);
		} catch (e) {
			console.error('Failed to add features to draw', e);
			alert('Gagal memindahkan ke mode edit: Format data kompleks.');
			return;
		}

		generatedLayerIds.forEach((id) => {
			if (mapInstance && mapInstance.getLayer(id)) mapInstance.removeLayer(id);
		});
		const sourceId = 'generated-osm-data';
		if (mapInstance && mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId);
		generatedLayerIds = [];

		mappingResult = null;

		setTimeout(() => {
			updateMapState();
		}, 100);
	}

	async function runGeminiAnalysis() {
		if (!mapInstance) return;

		aiAnalyzing = true;
		aiResponse = '';
		try {
			const snapshot = getMapSnapshot(mapInstance);
			const contextGeoJSON = mappingResult || currentFeature;

			// Start Timer
			let seconds = 0;
			aiAnalysisTimer = setInterval(() => {
				seconds++;
				const minutes = Math.floor(seconds / 60);
				const secs = seconds % 60;
				aiTimeElapsed = `${minutes}:${secs.toString().padStart(2, '0')}`;
				
				// Update status update message based on time
				if (seconds > 10) aiStatusMessage = 'Mengirim data ke GeoAI...';
				if (seconds > 30) aiStatusMessage = 'Sedang memproses geometri (ini mungkin memakan waktu)...';
				if (seconds > 60) aiStatusMessage = 'Analisis mendalam sedang berlangsung...';
				if (seconds > 120) aiStatusMessage = 'Masih bekerja, mohon bersabar (maks 5 menit)...';
				if (seconds > 240) aiStatusMessage = 'Hampir selesai...';
			}, 1000);

			// Call Server API
			const res = await fetch('/api/analyze', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					image: snapshot,
					context: contextGeoJSON
				})
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Failed to analyze');
			}

			aiResponse = data.text;
		} catch (e: any) {
			console.error(e);
			aiResponse = `Error: ${e.message || 'Gagal menganalisis peta.'}`;
			if (e.name === 'AbortError') {
				aiResponse = 'Waktu habis. Analisis memakan waktu terlalu lama (> 5 menit). Silakan coba dengan area yang lebih kecil.';
			}
		} finally {
			aiAnalyzing = false;
			if (aiAnalysisTimer) clearInterval(aiAnalysisTimer);
			aiStatusMessage = 'AI Analyzing Map...'; // Reset default
			aiTimeElapsed = '0:00';
		}
	}

	function resetMap() {
		if (mapInstance) {
			generatedLayerIds.forEach((id) => {
				if (mapInstance && mapInstance.getLayer(id)) mapInstance.removeLayer(id);
			});
			const sourceId = 'generated-osm-data';
			if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId);
			generatedLayerIds = [];
		}

		mappingResult = null;

		if (drawToolsComponent) {
			drawToolsComponent.deleteAll();
			drawToolsComponent.changeMode('draw_polygon');
		}
		currentArea = 0;
		currentFeature = null;
		isProcessing = false;
		aiResponse = '';
	}

	function downloadResult() {
		if (!mappingResult) return;

		const dataStr =
			'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(mappingResult));
		const downloadAnchorNode = document.createElement('a');
		downloadAnchorNode.setAttribute('href', dataStr);
		downloadAnchorNode.setAttribute('download', 'mapping_result.geojson');
		document.body.appendChild(downloadAnchorNode);
		downloadAnchorNode.click();
		downloadAnchorNode.remove();
	}
</script>

<div class="flex h-screen w-full overflow-hidden bg-gray-50">
	<!-- Sidebar -->
	<aside class="z-10 flex w-80 flex-col overflow-hidden border-r bg-white shadow-lg">
		<div class="border-b p-6">
			<h1 class="text-xl font-bold text-gray-800">GIS Automation</h1>
			<p class="text-sm text-gray-500">Web Mapping Tool</p>

			<!-- Satellite Toggle -->
			<div class="mt-4 flex items-center gap-2">
				<button
					onclick={toggleSatellite}
					class="flex flex-1 items-center justify-center gap-2 rounded border px-3 py-2 text-sm font-medium transition-colors {showSatellite
						? 'border-blue-200 bg-blue-100 text-blue-700'
						: 'bg-gray-50 text-gray-700 hover:bg-gray-100'}"
				>
					<Layers class="h-4 w-4" />
					{showSatellite ? 'Satellite ON' : 'Satellite OFF'}
				</button>
			</div>
		</div>

		<div class="scrollbar-hide flex-1 overflow-y-auto p-6">
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

				<!-- Mapping Results Stats -->
				{#if mappingResult}
					<div class="rounded-xl border border-blue-100 bg-blue-50 p-4">
						<h3 class="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-800">
							<CheckCircle class="h-4 w-4" />
							Mapping Success
						</h3>
						<div class="grid grid-cols-2 gap-3">
							<div class="rounded-lg bg-white p-3 shadow-sm">
								<span class="block text-xs text-gray-500 uppercase">Buildings</span>
								<span class="text-xl font-bold text-gray-800">{stats.buildings}</span>
							</div>
							<div class="rounded-lg bg-white p-3 shadow-sm">
								<span class="block text-xs text-gray-500 uppercase">Roads</span>
								<span class="text-xl font-bold text-gray-800">{stats.roads}</span>
							</div>
						</div>

						<!-- Action Buttons -->
						<div class="mt-4 grid grid-cols-2 gap-2">
							<button
								onclick={handleEditMode}
								class="flex items-center justify-center gap-1 rounded border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
							>
								<Edit3 class="h-3 w-3" />
								Edit Mode
							</button>
							<button
								onclick={downloadResult}
								class="flex items-center justify-center gap-1 rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
							>
								<Save class="h-3 w-3" />
								Download
							</button>
						</div>

						<!-- AI Analysis Result -->
						{#if aiAnalyzing}
							<div
								class="mt-4 flex flex-col items-center justify-center gap-2 rounded bg-purple-50 p-4 text-xs text-purple-700"
							>
								<div class="flex items-center gap-2">
									<Loader2 class="h-4 w-4 animate-spin" />
									<span class="font-bold text-sm">{aiTimeElapsed}</span>
								</div>
								<span class="font-medium text-center">{aiStatusMessage}</span>
							</div>
						{:else if aiResponse}
							<div class="mt-4 rounded border border-purple-100 bg-purple-50 p-3">
								<h4 class="mb-2 flex items-center gap-2 text-xs font-bold text-purple-800">
									<Bot class="h-3 w-3" />
									AI Verification
								</h4>
								<div class="max-h-60 overflow-y-auto text-xs text-gray-700">
									<pre class="font-mono whitespace-pre-wrap">{aiResponse}</pre>
								</div>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Instructions -->
				{#if currentArea === 0 && !mappingResult}
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
