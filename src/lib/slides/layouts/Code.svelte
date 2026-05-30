<script lang="ts">
	import Slide from '../Slide.svelte';

	let {
		code,
		lang,
		caption
	}: { code: string; lang?: string; caption?: string } = $props();
</script>

<Slide>
	{#if caption}
		<h2 class="mb-6 text-4xl font-bold tracking-tight">{caption}</h2>
	{/if}
	<div class="overflow-hidden rounded-xl border border-white/10 bg-black/40">
		{#if lang}
			<div class="border-b border-white/10 px-5 py-2 text-sm text-white/40">{lang}</div>
		{/if}
		<pre class="overflow-auto px-6 py-5 text-2xl leading-relaxed"><code>{code}</code></pre>
	</div>
</Slide>
