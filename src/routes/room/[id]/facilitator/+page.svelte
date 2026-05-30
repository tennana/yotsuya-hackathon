<script lang="ts">
	import { page } from '$app/state';
	import FacilitatorBoard from '$lib/components/FacilitatorBoard.svelte';
</script>

<svelte:head>
	<title>ファシリテーター | 場温計</title>
</svelte:head>

<FacilitatorBoard roomId={page.params.id ?? 'demo'} />
