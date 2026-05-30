<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { setDeckContext } from './context';

	let { slides }: { slides: Snippet } = $props();

	const STAGE_W = 1280;
	const STAGE_H = 720;

	let current = $state(0);
	let total = $state(0);
	let innerWidth = $state(STAGE_W);
	let innerHeight = $state(STAGE_H);

	const scale = $derived(Math.min(innerWidth / STAGE_W, innerHeight / STAGE_H) || 1);

	setDeckContext({
		register: () => total++,
		get current() {
			return current;
		}
	});

	function go(n: number) {
		current = Math.max(0, Math.min(n, total - 1));
		const hash = `#${current + 1}`;
		if (location.hash !== hash) history.replaceState(history.state, '', hash);
	}

	function syncFromHash() {
		const n = Number.parseInt(location.hash.slice(1), 10);
		if (!Number.isNaN(n)) go(n - 1);
	}

	function onkeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'ArrowRight':
			case 'PageDown':
			case ' ':
				event.preventDefault();
				go(current + 1);
				break;
			case 'ArrowLeft':
			case 'PageUp':
				event.preventDefault();
				go(current - 1);
				break;
			case 'Home':
				event.preventDefault();
				go(0);
				break;
			case 'End':
				event.preventDefault();
				go(total - 1);
				break;
		}
	}

	function onclick(event: MouseEvent) {
		// Don't advance when interacting with a live demo or the nav controls.
		if ((event.target as HTMLElement).closest('[data-no-advance]')) return;
		go(current + 1);
	}

	onMount(syncFromHash);
</script>

<svelte:window
	bind:innerWidth
	bind:innerHeight
	{onkeydown}
	{onclick}
	onhashchange={syncFromHash}
/>

<svelte:head>
	<style>
		body {
			overflow: hidden;
		}
	</style>
</svelte:head>

<div class="fixed inset-0 grid select-none place-items-center overflow-hidden bg-black">
	<div
		class="relative origin-center overflow-hidden bg-slate-950 text-white"
		style="width: {STAGE_W}px; height: {STAGE_H}px; transform: scale({scale});"
	>
		{@render slides()}
	</div>

	<div
		class="fixed right-5 bottom-4 flex items-center gap-3 text-base text-white/70"
		data-no-advance
	>
		<button
			class="rounded px-2 py-1.5 text-lg hover:bg-white/10 disabled:opacity-30"
			disabled={current === 0}
			onclick={() => go(current - 1)}
			aria-label="前のスライド"
		>
			←
		</button>
		<span class="tabular-nums text-xl font-semibold">{current + 1} / {total}</span>
		<button
			class="rounded px-2 py-1.5 text-lg hover:bg-white/10 disabled:opacity-30"
			disabled={current >= total - 1}
			onclick={() => go(current + 1)}
			aria-label="次のスライド"
		>
			→
		</button>
	</div>

	<div class="fixed inset-x-0 bottom-0 h-1 bg-white/10">
		<div
			class="h-full bg-indigo-500 transition-[width] duration-300"
			style="width: {total > 1 ? (current / (total - 1)) * 100 : 0}%;"
		></div>
	</div>
</div>
