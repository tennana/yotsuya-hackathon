<script lang="ts">
	import Slide from '../Slide.svelte';

	let { title, subtitle }: { title: string; subtitle?: string } = $props();
</script>

<Slide>
	<div class="flex h-full flex-col items-center justify-center gap-6 text-center">
		<h1 class="text-7xl font-bold tracking-tight">{title}</h1>
		{#if subtitle}
			<p class="text-3xl text-white/60">{subtitle}</p>
		{/if}
	</div>
</Slide>
