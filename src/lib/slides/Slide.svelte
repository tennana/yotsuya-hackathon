<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import { getDeckContext } from './context';

	let { children }: { children: Snippet } = $props();

	const deck = getDeckContext();
	const index = deck.register();
	const active = $derived(deck.current === index);
</script>

{#if active}
	<section
		class="absolute inset-0 flex flex-col justify-center px-24 py-16"
		transition:fade={{ duration: 150 }}
	>
		{@render children()}
	</section>
{/if}
