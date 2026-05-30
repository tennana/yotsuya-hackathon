<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		CATEGORIES,
		KIND_LABEL,
		SignalEvent,
		type Category,
		type SignalEvent as SignalEventType
	} from '$lib/events';
	import { createDemoSource, DEMO_TIMELINE } from '$lib/sources/demoSource';
	import {
		broadcastSignal,
		classifyText,
		createSignalEvent,
		getParticipantId
	} from '$lib/sources/liveSource';
	import { createBrowserSupabaseClient } from '$lib/supabase';
	import { createSuggestionEngine, type Suggestion } from '$lib/suggestions';
	import {
		categoryColor,
		categorySummary,
		computeTemperatures,
		dominantCategory
	} from '$lib/thermo';
	import type { RealtimeChannel } from '@supabase/supabase-js';
	import { onMount } from 'svelte';

	let { roomId = 'demo', embedded = false }: { roomId?: string; embedded?: boolean } = $props();

	const timeFormatter = new Intl.DateTimeFormat('ja-JP', {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	});

	let events = $state<SignalEventType[]>([]);
	let suggestions = $state<Suggestion[]>([]);
	let now = $state(Date.now());
	let demoStatus = $state('デモ未開始');
	let realtimeStatus = $state('接続準備中');
	let facilitatorDraft = $state('');
	let facilitatorStatus = $state('待機中');
	let facilitatorId = '';
	let channel = $state<RealtimeChannel | null>(null);
	let demoStartedAt = $state<number | null>(null);
	let demoRunning = $state(false);

	const demoSource = createDemoSource();
	const suggestionEngine = createSuggestionEngine();
	const demoDurationMs = Math.max(...DEMO_TIMELINE.map((event) => event.at)) + 300;
	const demoTargetTemps = {
		反論: 86,
		不安: 74,
		質問: 63,
		納得: 19
	} satisfies Record<Category, number>;
	const demoTargetCounts = {
		反論: 2,
		不安: 2,
		質問: 1,
		納得: 2
	} satisfies Record<Category, number>;
	const aiSuggestionText =
		'表面上は合意に見えますが、裏では反論と不安が急上昇しています。今決めると、あとで「聞いてないです」が発生する可能性があります。匿名で懸念点を1分だけ集めましょう。';

	const rawTemps = $derived(computeTemperatures(events, now));
	const hasDemoEvents = $derived(events.some((event) => event.participantId.startsWith('demo-')));
	const demoCategoryProgress = $derived.by(() => {
		const counts = {
			反論: 0,
			不安: 0,
			質問: 0,
			納得: 0
		} satisfies Record<Category, number>;

		for (const event of events) {
			if (!event.participantId.startsWith('demo-') || !event.category) continue;
			counts[event.category] += 1;
		}

		return CATEGORIES.reduce(
			(progress, category) => {
				progress[category] = Math.min(1, counts[category] / demoTargetCounts[category]);
				return progress;
			},
			{
				反論: 0,
				不安: 0,
				質問: 0,
				納得: 0
			} satisfies Record<Category, number>
		);
	});
	const temps = $derived.by(() => {
		if (!hasDemoEvents) return rawTemps;

		const next = { ...rawTemps };
		for (const category of CATEGORIES) {
			const factor = demoStatus === 'デモ再生完了' ? 1 : demoCategoryProgress[category];
			if (factor >= 1) {
				next[category] = demoTargetTemps[category];
			} else if (factor > 0) {
				next[category] = Math.max(next[category], demoTargetTemps[category] * factor);
			}
		}

		return next;
	});
	const summaries = $derived(categorySummary(temps));
	const dominant = $derived(dominantCategory(temps));
	const surfaceMessages = $derived(
		events
			.filter((event) => event.kind === 'sent' && event.text)
			.slice(-8)
	);
	const hiddenCount = $derived(events.filter((event) => event.kind !== 'sent').length);
	const recentSignals = $derived(
		events
			.filter((event) => event.kind !== 'sent')
			.slice(-12)
			.reverse()
	);
	const quietFireDetected = $derived(
		temps.反論 >= 80 && temps.不安 >= 65 && temps.納得 <= 35
	);
	const aiAlertActive = $derived(quietFireDetected || hiddenCount >= 3 || suggestions.length > 0);
	const verdictText = $derived(
		quietFireDetected ? '判定：静かな炎上' : '判定：見かけ上の合意'
	);
	const demoProgress = $derived.by(() => {
		if (!demoStartedAt) return 0;
		if (!demoRunning && demoStatus === 'デモ再生完了') return 1;
		const elapsed = Math.max(0, now - demoStartedAt);
		return Math.max(0, Math.min(1, elapsed / demoDurationMs));
	});

	function formatTime(t: number) {
		return timeFormatter.format(new Date(t));
	}

	function addEvent(input: unknown) {
		const parsed = SignalEvent.safeParse(input);
		if (!parsed.success) return;

		events = [...events, parsed.data].slice(-400);

		const nextSuggestions = suggestionEngine.evaluate(
			computeTemperatures(events, Date.now()),
			Date.now()
		);
		if (nextSuggestions.length > 0) {
			suggestions = [...nextSuggestions.reverse(), ...suggestions].slice(0, 6);
		}
	}

	function sourceLabel(participantId: string) {
		if (participantId.startsWith('demo-')) return 'デモ';
		if (participantId.startsWith('facilitator-')) return 'ファシリ';
		return '参加者';
	}

	function sourceStyle(participantId: string) {
		if (participantId.startsWith('demo-')) {
			return 'bg-violet-300/20 text-violet-200 border-violet-200/40';
		}
		if (participantId.startsWith('facilitator-')) {
			return 'bg-sky-300/20 text-sky-200 border-sky-200/40';
		}
		return 'bg-emerald-300/20 text-emerald-200 border-emerald-200/40';
	}

	function recentSentContext() {
		return events
			.filter((event) => event.kind === 'sent')
			.map((event) => event.text)
			.filter((text): text is string => Boolean(text))
			.slice(-2)
			.reverse();
	}

	function startDemo() {
		demoStartedAt = Date.now();
		demoRunning = true;
		demoStatus = 'デモ再生中';
		demoSource.start(addEvent, () => {
			demoRunning = false;
			demoStatus = 'デモ再生完了';
		});
	}

	function resetDemo() {
		demoSource.stop();
		events = [];
		suggestions = [];
		suggestionEngine.reset();
		now = Date.now();
		startDemo();
	}

	function resetWithoutDemo() {
		demoSource.stop();
		demoRunning = false;
		demoStartedAt = null;
		events = [];
		suggestions = [];
		suggestionEngine.reset();
		now = Date.now();
		demoStatus = 'デモ停止中';
	}

	async function sendFacilitatorMessage() {
		const text = facilitatorDraft.trim();
		if (!text) return;

		facilitatorStatus = '分類中';
		try {
			const classification = await classifyText(text, 'sent', {
				roomId,
				recentSentTexts: recentSentContext()
			});
			const event = createSignalEvent({
				participantId: facilitatorId,
				kind: 'sent',
				classification,
				text
			});
			addEvent(event);
			await broadcastSignal(channel, event);
			facilitatorDraft = '';
			facilitatorStatus = `${classification.category} ${Math.round(classification.intensity * 100)}%`;
		} catch {
			facilitatorStatus = '分類 API に接続できません';
		}
	}

	function handleFacilitatorKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			void sendFacilitatorMessage();
		}
	}

	function handleFacilitatorInput(event: Event) {
		facilitatorDraft = (event.currentTarget as HTMLTextAreaElement).value;
	}

	onMount(() => {
		facilitatorId = `facilitator-${getParticipantId()}`;

		const interval = setInterval(() => {
			now = Date.now();
		}, 250);

		const client = createBrowserSupabaseClient();
		if (!client) {
			realtimeStatus = 'Supabase 環境変数が未設定';
			return () => {
				clearInterval(interval);
				demoSource.stop();
			};
		}

		const nextChannel = client
			.channel(`room:${roomId}`)
			.on('broadcast', { event: 'signal' }, ({ payload }) => {
				addEvent(payload);
			});

		channel = nextChannel;

		nextChannel.subscribe((status) => {
			if (status === 'SUBSCRIBED') realtimeStatus = 'Realtime 接続中';
			else if (status === 'CHANNEL_ERROR') realtimeStatus = 'Realtime エラー';
			else if (status === 'TIMED_OUT') realtimeStatus = 'Realtime タイムアウト';
			else if (status === 'CLOSED') realtimeStatus = 'Realtime 切断';
			else realtimeStatus = `Realtime ${status}`;
		});

		return () => {
			clearInterval(interval);
			demoSource.stop();
			channel = null;
			void client.removeChannel(nextChannel);
		};
	});
</script>

<!-- 温度カード（場温計の主役）。compact=埋め込み用に文字と余白を縮小 -->
{#snippet tempCards(compact: boolean)}
	<section class={`grid gap-3 ${compact ? 'grid-cols-2 sm:grid-cols-4' : 'sm:grid-cols-2 xl:grid-cols-4'}`}>
		{#each summaries as item (item.category)}
			{@const color = categoryColor(item.temp)}
			{@const isCritical = (item.category === '反論' || item.category === '不安') && item.temp >= 55}
			{@const barBackground = isCritical
				? `linear-gradient(90deg, #fb923c 0%, ${color} 55%, #ef4444 100%)`
				: color}
			<article
				class={`rounded-md border transition ${
					isCritical
						? 'bg-red-950/30 shadow-[0_0_34px_rgba(239,68,68,0.2)]'
						: 'bg-neutral-900'
				} ${compact ? 'p-3' : 'p-4'}`}
				style:border-color={color}
			>
				<div class="flex items-start justify-between gap-3">
					<div>
						<p class="text-sm text-neutral-400">{item.category}</p>
						<p class={`mt-1 font-semibold tabular-nums ${compact ? 'text-3xl' : 'text-4xl'}`}>
							{Math.round(item.temp)}℃
						</p>
					</div>
					<div
						class={`rounded-full border border-white/15 ${compact ? 'h-9 w-9' : 'h-12 w-12'}`}
						style="background: radial-gradient(circle at 35% 30%, white 0, {color} 22%, transparent 70%); box-shadow: 0 0 {Math.max(
							isCritical ? 28 : 10,
							item.temp / (isCritical ? 1.4 : 2)
						)}px {color};"
						aria-hidden="true"
					></div>
				</div>
				<div class="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
					<div
						class="h-full rounded-full transition-[width] duration-300"
						style="width: {item.temp}%; background: {barBackground};"
					></div>
				</div>
				{#if !compact}
					<p class="mt-3 text-xs text-neutral-500">
						{item.category === dominant ? '現在もっとも熱いカテゴリ' : '指数減衰で自然に冷却'}
					</p>
				{/if}
			</article>
		{/each}
	</section>
{/snippet}

<!-- デモの結論。表面の納得と裏の反論を横並びで見せる -->
{#snippet verdictStrip(compact: boolean)}
	<section
		class={`rounded-md border ${
			quietFireDetected
				? 'border-red-300/45 bg-red-950/25 shadow-[0_0_38px_rgba(239,68,68,0.18)]'
				: 'border-amber-300/25 bg-neutral-900'
		} ${compact ? 'p-3' : 'p-4'}`}
	>
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div>
				<p class="text-xs tracking-[0.2em] text-amber-200/80 uppercase">demo judgement</p>
				<p class={`mt-1 font-semibold ${compact ? 'text-2xl' : 'text-4xl'}`}>
					{verdictText}
				</p>
			</div>
			<div class="grid gap-1 text-sm text-neutral-300 sm:grid-cols-3 sm:gap-3">
				<span>表面温度：納得 {Math.round(temps.納得)}℃</span>
				<span>裏温度：反論 {Math.round(temps.反論)}℃</span>
				<span>状態：{quietFireDetected ? '静かな炎上' : '見かけ上の合意'}</span>
			</div>
		</div>
	</section>
{/snippet}

<!-- 表面のチャット（送信済みのみ） -->
{#snippet surfaceChat(limit: number)}
	<div class="flex min-h-0 flex-col rounded-md border border-white/10 p-4">
		<div class="flex items-center justify-between gap-3">
			<h2 class="text-lg font-semibold">表面のチャット</h2>
			<span class="text-xs text-neutral-500">sent only</span>
		</div>
		<div class="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto">
			{#if surfaceMessages.length === 0}
				<p class="text-sm text-neutral-500">送信済みチャットを待機中。</p>
			{:else}
				{#each surfaceMessages.slice(0, limit) as message, index (`${message.participantId}-${message.t}-${index}`)}
					<div class="border-l-2 border-emerald-300/70 py-1 pl-3">
						<div class="mb-1 flex items-center gap-2">
							<span
								class={`rounded-full border px-2 py-0.5 text-xs font-medium ${sourceStyle(message.participantId)}`}
							>
								{sourceLabel(message.participantId)}
							</span>
						</div>
						<p class="text-sm text-neutral-200">{message.text}</p>
						<p class="mt-1 text-xs text-neutral-500">{formatTime(message.t)}</p>
					</div>
				{/each}
			{/if}
		</div>
	</div>
{/snippet}

<!-- 見えないシグナル（未送信・削除・入力停止。本文は出さない） -->
{#snippet hiddenSignals(limit: number)}
	<div class="flex min-h-0 flex-col rounded-md border border-white/10 p-4">
		<div class="flex items-center justify-between gap-3">
			<h2 class="text-lg font-semibold">見えないシグナル</h2>
			<span class="text-xs text-neutral-500">{hiddenCount} hidden</span>
		</div>
		<div class="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
			{#if recentSignals.length === 0}
				<p class="text-sm text-neutral-500">イベントを待機中。</p>
			{:else}
				{#each recentSignals.slice(0, limit) as event, index (`${event.participantId}-${event.t}-${event.kind}-${index}`)}
					{@const color = categoryColor(event.category ? temps[event.category] : 0)}
					<div class="flex items-center justify-between gap-3 border-b border-white/5 py-2">
						<div class="min-w-0">
							<div class="mb-1">
								<span
									class={`rounded-full border px-2 py-0.5 text-xs font-medium ${sourceStyle(event.participantId)}`}
								>
									{sourceLabel(event.participantId)}
								</span>
							</div>
							<p class="truncate text-sm text-neutral-200">
								{KIND_LABEL[event.kind]} / {event.category ?? '未分類'}
							</p>
							<p class="text-xs text-neutral-500">{formatTime(event.t)}</p>
						</div>
						<span
							class="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-neutral-950"
							style="background: {color};"
						>
							{Math.round(event.intensity * 100)}
						</span>
					</div>
				{/each}
			{/if}
		</div>
	</div>
{/snippet}

<!-- AI 提案（ルールベース） -->
{#snippet aiSuggestions()}
	<div class="flex min-h-0 flex-col rounded-md border border-white/10 p-4">
		<div class="flex items-center justify-between gap-3">
			<h2 class="text-lg font-semibold">提案</h2>
			<span class="text-xs text-neutral-500">rule based</span>
		</div>
		<div class="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto">
			{#if aiAlertActive}
				<div class="rounded-md border border-red-300/35 bg-red-950/25 p-3">
					<p class="text-xl font-semibold text-red-100">検知：静かな炎上</p>
					<p class="mt-3 text-sm leading-6 text-neutral-100">{aiSuggestionText}</p>
				</div>
			{:else if suggestions.length === 0}
				<p class="text-sm text-neutral-500">温度がしきい値を越えると、ここに次アクションが出ます。</p>
			{:else}
				{#each suggestions as suggestion, index (`${suggestion.id}-${index}`)}
					<div class="border-l-2 py-1 pl-3" style="border-color: {categoryColor(suggestion.temp)};">
						<p class="text-sm font-medium text-neutral-100">{suggestion.text}</p>
						<p class="mt-1 text-xs text-neutral-500">
							{suggestion.category}
							{Math.round(suggestion.temp)} / {formatTime(suggestion.t)}
						</p>
					</div>
				{/each}
			{/if}
		</div>
	</div>
{/snippet}

<!-- デモ操作ボタン（compact=ラベルを短く） -->
{#snippet demoControls(compact: boolean)}
	<button
		class="rounded-md border border-sky-300/40 px-4 py-2 text-sm font-semibold text-sky-100 hover:border-sky-200 hover:text-sky-50"
		type="button"
		onclick={startDemo}
	>
		デモを開始
	</button>
	<button
		class="rounded-md bg-amber-300 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-amber-200"
		type="button"
		onclick={resetDemo}
	>
		{compact ? 'リセット' : 'デモをリセット'}
	</button>
	{#if !compact}
		<button
			class="rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-neutral-100 hover:border-white/40"
			type="button"
			onclick={resetWithoutDemo}
		>
			リセット（デモ停止）
		</button>
	{/if}
{/snippet}

{#if embedded}
	<div class="flex h-full w-full flex-col gap-3 text-left text-neutral-50">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex flex-wrap items-center gap-2">
				{@render demoControls(true)}
			</div>
			<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400">
				<span>{demoStatus}</span>
				<span>{realtimeStatus}</span>
				<span>Room: {roomId}</span>
			</div>
		</div>

		{@render tempCards(true)}
		{@render verdictStrip(true)}

		<div class="grid min-h-0 flex-1 gap-3 lg:grid-cols-3">
			{@render surfaceChat(4)}
			{@render hiddenSignals(6)}
			{@render aiSuggestions()}
		</div>

		{#if demoRunning}
			<div
				class="fixed bottom-4 left-5 z-20 w-[90%] rounded-md border border-orange-300/25 bg-neutral-900/85 p-2"
				data-no-advance
			>
				<div class="mb-1 flex items-center justify-between gap-3 text-xs text-orange-100/90">
					<span>デモ進行</span>
					<span class="tabular-nums">{Math.round(demoProgress * 100)}%</span>
				</div>
				<div class="h-2 overflow-hidden rounded-full bg-white/10">
					<div
						class="h-full transition-[width] duration-200"
						style="width: {demoProgress * 100}%; background: linear-gradient(90deg, #fb923c 0%, #f97316 45%, #ef4444 100%);"
					></div>
				</div>
			</div>
		{/if}
	</div>
{:else}
	<main class="min-h-screen bg-neutral-950 text-neutral-50">
		<div class="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-5 py-5 sm:px-8">
			<header class="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
				<div>
					<p class="text-xs tracking-[0.24em] text-amber-300 uppercase">Unsaid Board</p>
					<h1 class="mt-2 text-3xl font-semibold">場温計</h1>
					<p class="mt-1 max-w-2xl text-sm text-neutral-400">
						表面のチャットと、送信されなかった声の温度を同じタイムラインで見る。
					</p>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<a
						class="rounded-md border border-white/15 px-4 py-2 text-sm text-neutral-100 hover:border-amber-300 hover:text-amber-200"
						href={resolve('/room/[id]', { id: roomId })}
						target="_blank"
					>
						参加者入力
					</a>
					{@render demoControls(false)}
				</div>
			</header>

			<section class="grid flex-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
				<div class="space-y-5">
					<section class="rounded-md border border-white/10 bg-neutral-900 p-4">
						<div class="flex items-center justify-between gap-3">
							<h2 class="text-lg font-semibold">ファシリテーター発言</h2>
							<span class="text-xs text-neutral-500">room broadcast</span>
						</div>
						<textarea
							class="mt-3 min-h-24 w-full resize-none rounded-md border border-white/10 bg-neutral-950 px-3 py-2 text-sm leading-6 text-neutral-100 outline-none focus:border-sky-300"
							placeholder="例: いま反論が増えているので、懸念を1分だけ出しましょう"
							value={facilitatorDraft}
							oninput={handleFacilitatorInput}
							onkeydown={handleFacilitatorKeydown}
						></textarea>
						<div class="mt-3 flex items-center justify-between gap-3">
							<p class="text-xs text-neutral-500">{facilitatorStatus}</p>
							<button
								class="rounded-md bg-sky-300 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-40"
								type="button"
								disabled={!facilitatorDraft.trim()}
								onclick={() => void sendFacilitatorMessage()}
							>
								発言を送信
							</button>
						</div>
					</section>

					{@render tempCards(false)}
					{@render verdictStrip(false)}

					<section class="grid gap-5 lg:grid-cols-2">
						{@render surfaceChat(8)}
						{@render hiddenSignals(12)}
					</section>
				</div>

				<aside class="space-y-5">
					<section class="rounded-md border border-white/10 p-4">
						<p class="text-xs tracking-[0.2em] text-neutral-500 uppercase">status</p>
						<div class="mt-3 space-y-2 text-sm text-neutral-300">
							<p>{demoStatus}</p>
							<p>{realtimeStatus}</p>
							<p>Room: {roomId}</p>
						</div>
					</section>

					{@render aiSuggestions()}

					<section class="rounded-md border border-white/10 p-4">
						<h2 class="text-lg font-semibold">デモの山場</h2>
						<p class="mt-3 text-sm leading-6 text-neutral-400">
							送信済みチャットは穏やかなまま、未送信の反論だけが赤く上昇します。
						</p>
					</section>
				</aside>
			</section>
		</div>
	</main>
{/if}
