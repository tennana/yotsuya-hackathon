<script lang="ts">
	import Slide from '../Slide.svelte';

	let { text }: { text: string } = $props();
</script>

<Slide>
	<p class="text-center text-6xl font-bold leading-tight tracking-tight text-balance">
		{text}
	</p>
</Slide>
