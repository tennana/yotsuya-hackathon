<script lang="ts">
	import type { Snippet } from 'svelte';
	import Slide from '../Slide.svelte';

	let { heading, children }: { heading?: string; children: Snippet } = $props();
</script>

<Slide>
	{#if heading}
		<h2 class="mb-6 text-5xl font-bold tracking-tight">{heading}</h2>
	{/if}
	<!-- data-no-advance: clicks here drive the live demo instead of advancing the deck. -->
	<div data-no-advance class="flex flex-1 items-center justify-center overflow-auto">
		{@render children()}
	</div>
</Slide>
