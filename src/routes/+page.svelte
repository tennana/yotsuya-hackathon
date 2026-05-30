<script lang="ts">
	import { resolve } from '$app/paths';

	const demoRoom = 'demo';
</script>

<svelte:head>
	<title>場温計</title>
</svelte:head>

<main class="min-h-screen bg-neutral-950 text-neutral-50">
	<div class="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center gap-8 px-5 py-10">
		<div>
			<p class="text-xs tracking-[0.24em] text-amber-300 uppercase">Unsaid Board</p>
			<h1 class="mt-4 text-5xl font-semibold">場温計</h1>
			<p class="mt-4 max-w-2xl text-lg leading-8 text-neutral-300">
				会議の沈黙は、合意とは限らない。送信されなかった声を温度として可視化するデモです。
			</p>
		</div>

		<nav class="flex flex-wrap gap-3">
			<a
				class="rounded-md bg-amber-300 px-5 py-3 text-sm font-semibold text-neutral-950 hover:bg-amber-200"
				href={resolve('/room/[id]/facilitator', { id: demoRoom })}
			>
				ファシリテーター画面
			</a>
			<a
				class="rounded-md border border-white/15 px-5 py-3 text-sm font-semibold text-neutral-100 hover:border-amber-300 hover:text-amber-200"
				href={resolve('/room/[id]', { id: demoRoom })}
			>
				参加者入力
			</a>
			<a
				class="rounded-md border border-white/15 px-5 py-3 text-sm font-semibold text-neutral-100 hover:border-amber-300 hover:text-amber-200"
				href={resolve('/slides')}
			>
				発表スライド
			</a>
		</nav>
	</div>
</main>
