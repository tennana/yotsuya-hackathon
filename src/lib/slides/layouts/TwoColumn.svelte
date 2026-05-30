<script lang="ts">
	import type { Snippet } from 'svelte';
	import Slide from '../Slide.svelte';

	let {
		heading,
		left,
		right
	}: { heading?: string; left: Snippet; right: Snippet } = $props();
</script>

<Slide>
	{#if heading}
		<h2 class="mb-8 text-5xl font-bold tracking-tight">{heading}</h2>
	{/if}
	<div class="grid flex-1 grid-cols-2 gap-12 text-3xl leading-snug">
		<div class="flex flex-col justify-center gap-4">{@render left()}</div>
		<div class="flex flex-col justify-center gap-4">{@render right()}</div>
	</div>
</Slide>
