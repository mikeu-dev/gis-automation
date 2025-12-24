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

	function handleMapLoad(map: MapLibreMap) {
		mapInstance = map;
		console.log('Map loaded');
	}

	function handleDraw(feature: any) {
		if (!feature) {
			currentArea = 0;
			currentFeature = null;
			return;
		}

		currentFeature = feature;
		currentArea = calculateArea(feature);
	}

	function handleDrawDelete() {
		currentArea = 0;
		currentFeature = null;
	}

	function startMapping() {
		if (!isValidSize || !currentFeature) return;
		isProcessing = true;

		// Simulate processing
		setTimeout(() => {
			isProcessing = false;
			alert('Mapping logic will be implemented here!');
		}, 2000);
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
			<button
				onclick={startMapping}
				disabled={!isValidSize || currentArea === 0 || isProcessing}
				class="flex w-full items-center justify-center gap-2 rounded-lg py-3 font-semibold text-white transition-all
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
	</aside>

	<!-- Main Map Area -->
	<main class="relative flex-1">
		<Map onLoad={handleMapLoad} />
		{#if mapInstance}
			<DrawTools
				map={mapInstance}
				onDrawCreate={handleDraw}
				onDrawUpdate={handleDraw}
				onDrawDelete={handleDrawDelete}
			/>
		{/if}
	</main>
</div>
