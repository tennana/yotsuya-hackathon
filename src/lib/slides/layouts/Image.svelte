<script lang="ts">
	import Slide from '../Slide.svelte';

	let {
		src,
		alt,
		caption
	}: { src: string; alt: string; caption?: string } = $props();
</script>

<Slide>
	<figure class="flex h-full flex-col items-center justify-center gap-6">
		<img {src} {alt} class="max-h-[80%] max-w-full rounded-xl object-contain" />
		{#if caption}
			<figcaption class="text-2xl text-white/60">{caption}</figcaption>
		{/if}
	</figure>
</Slide>
