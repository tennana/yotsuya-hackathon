<script lang="ts">
	import { fly } from 'svelte/transition';
	import Slide from '../Slide.svelte';

	let { heading, items }: { heading: string; items: string[] } = $props();
</script>

<Slide>
	<h2 class="mb-10 text-5xl font-bold tracking-tight">{heading}</h2>
	<ul class="flex flex-col gap-5">
		{#each items as item, i (i)}
			<li
				class="flex items-start gap-4 text-3xl leading-snug"
				in:fly={{ y: 12, delay: i * 70, duration: 250 }}
			>
				<span class="mt-3 size-2.5 shrink-0 rounded-full bg-indigo-400"></span>
				<span>{item}</span>
			</li>
		{/each}
	</ul>
</Slide>
