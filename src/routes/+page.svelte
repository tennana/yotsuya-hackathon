<script lang="ts">
	import { onMount } from 'svelte';
	import type { Analysis, LogEntry } from '$lib/schema.js';
	import { PRESETS } from '$lib/examples.js';
	import { cooldownMs, tempColor, formatMs } from '$lib/cooldown.js';

	// ── State ────────────────────────────────────────────────────────────
	type Phase = 'idle' | 'analyzing' | 'cooling' | 'passthrough' | 'revealed' | 'sent';

	let phase = $state<Phase>('idle');
	let text = $state('');
	let analysis = $state<Analysis | null>(null);
	let remaining = $state(0);
	let errorMsg = $state('');
	let log = $state<LogEntry[]>([]);

	// ── Derived ──────────────────────────────────────────────────────────
	const gaugeColor = $derived(analysis ? tempColor(analysis.temperature) : '#6b7280');
	const coolMs = $derived(analysis ? cooldownMs(analysis.temperature) : 0);
	const gaugeWidth = $derived(analysis ? `${analysis.temperature}%` : '0%');

	// ── Countdown timer ───────────────────────────────────────────────────
	$effect(() => {
		if (phase !== 'cooling') return;
		remaining = coolMs;
		const interval = setInterval(() => {
			remaining = Math.max(0, remaining - 100);
			if (remaining === 0) phase = 'revealed';
		}, 100);
		return () => clearInterval(interval);
	});

	// ── localStorage ──────────────────────────────────────────────────────
	onMount(() => {
		const raw = localStorage.getItem('cooldown-log');
		if (raw) {
			try {
				log = JSON.parse(raw);
			} catch {
				/* ignore */
			}
		}
	});

	function saveLog() {
		localStorage.setItem('cooldown-log', JSON.stringify(log));
	}

	// ── Actions ───────────────────────────────────────────────────────────
	async function handleAnalyze() {
		if (!text.trim() || phase === 'analyzing' || phase === 'cooling') return;
		phase = 'analyzing';
		errorMsg = '';
		analysis = null;

		try {
			const res = await fetch('/api/analyze', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text })
			});
			const data = (await res.json()) as { ok: boolean; analysis?: Analysis; error?: string };

			if (!data.ok) {
				errorMsg = data.error ?? '分析に失敗しました';
				phase = 'idle';
				return;
			}

			analysis = data.analysis ?? null;
			phase = analysis?.danger ? 'cooling' : 'passthrough';
		} catch {
			errorMsg = '通信エラーが発生しました';
			phase = 'idle';
		}
	}

	function handleSend(useRewrite = false) {
		if (!analysis) return;
		const entry: LogEntry = {
			id: crypto.randomUUID(),
			text: useRewrite && analysis.rewrite ? analysis.rewrite : text,
			analysis: { ...analysis },
			sentAt: Date.now()
		};
		log = [entry, ...log].slice(0, 50);
		saveLog();
		phase = 'sent';
	}

	function handleReset() {
		phase = 'idle';
		text = '';
		analysis = null;
		errorMsg = '';
		remaining = 0;
	}

	function loadPreset(i: number) {
		const p = PRESETS[i];
		text = p.text;
		analysis = p.analysis;
		phase = p.analysis.danger ? 'cooling' : 'passthrough';
	}

	function tempLabel(temp: number): string {
		if (temp < 40) return '低温 — 安全';
		if (temp < 65) return '中温 — 要注意';
		if (temp < 80) return '高温 — 危険';
		return '危険域 — 送信ブロック';
	}
</script>

<svelte:head>
	<title>CoolDown — 送信前に温度を測る</title>
</svelte:head>

<main class="min-h-screen bg-gray-950 p-4 text-gray-100 sm:p-6">
	<div class="mx-auto max-w-xl space-y-5">
		<!-- Header -->
		<header class="pt-4 text-center">
			<h1 class="text-3xl font-black tracking-tight">🌡️ CoolDown</h1>
			<p class="mt-1 text-sm text-gray-400">「怒りは、送信ボタンの速さで勝つ。」</p>
		</header>

		<!-- Preset buttons -->
		<section>
			<p class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">例文を試す</p>
			<div class="flex flex-wrap gap-2">
				{#each PRESETS as preset, i (preset.text)}
					<button
						class="rounded-full border border-gray-700 px-3 py-1 text-xs hover:border-gray-500 hover:bg-gray-800 transition-colors"
						onclick={() => loadPreset(i)}
					>
						{preset.label}
					</button>
				{/each}
			</div>
		</section>

		<!-- Compose -->
		<section class="space-y-3">
			<textarea
				class="w-full resize-none rounded-xl bg-gray-900 p-4 text-sm leading-relaxed outline-none ring-1 ring-gray-700 focus:ring-indigo-500 transition-shadow disabled:opacity-50"
				rows={4}
				placeholder="送る前に確認したいメッセージを入力..."
				bind:value={text}
				disabled={phase === 'analyzing' || phase === 'cooling'}
			></textarea>

			{#if errorMsg}
				<p class="text-sm text-red-400">{errorMsg}</p>
			{/if}

			<!-- Action buttons (phase-driven) -->
			<div class="flex gap-2">
				{#if phase === 'idle' || phase === 'sent'}
					<button
						class="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-40 transition-colors"
						onclick={handleAnalyze}
						disabled={!text.trim()}
					>
						温度をチェック
					</button>
				{:else if phase === 'analyzing'}
					<button class="flex-1 rounded-xl bg-gray-700 py-2.5 text-sm font-semibold" disabled>
						分析中…
					</button>
				{:else if phase === 'passthrough'}
					<button
						class="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold hover:bg-emerald-500 transition-colors"
						onclick={() => handleSend(false)}
					>
						✓ そのまま送信
					</button>
					<button
						class="rounded-xl px-4 py-2.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
						onclick={handleReset}
					>
						リセット
					</button>
				{:else if phase === 'cooling'}
					<button
						class="flex-1 rounded-xl py-2.5 text-sm font-bold tracking-wide"
						style="background-color: {gaugeColor}; opacity: 0.85;"
						disabled
					>
						冷却中… {formatMs(remaining)}
					</button>
				{:else if phase === 'revealed'}
					<button
						class="flex-1 rounded-xl bg-amber-600 py-2.5 text-sm font-semibold hover:bg-amber-500 transition-colors"
						onclick={() => handleSend(true)}
					>
						冷静版を送る
					</button>
					<button
						class="rounded-xl border border-gray-700 px-3 py-2.5 text-xs text-gray-400 hover:bg-gray-800 transition-colors"
						onclick={() => handleSend(false)}
					>
						元の文を送る
					</button>
					<button
						class="rounded-xl px-3 py-2.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
						onclick={handleReset}
					>
						✕
					</button>
				{/if}
			</div>
		</section>

		<!-- Analysis panel -->
		{#if analysis && phase !== 'idle' && phase !== 'analyzing'}
			<section class="space-y-4 rounded-2xl border border-gray-800 bg-gray-900 p-5">
				<!-- Temperature gauge -->
				<div class="space-y-2">
					<div class="flex items-baseline justify-between">
						<span class="text-xs font-medium text-gray-400">現在温度</span>
						<span class="text-2xl font-black tabular-nums" style="color: {gaugeColor}">
							{analysis.temperature}℃
						</span>
					</div>
					<div class="h-3 w-full overflow-hidden rounded-full bg-gray-800">
						<div
							class="h-full rounded-full transition-[width] duration-700"
							style="width: {gaugeWidth}; background-color: {gaugeColor};"
						></div>
					</div>
					<div class="flex justify-between text-xs text-gray-600">
						<span>0 — 冷静</span>
						<span style="color: {gaugeColor}">{tempLabel(analysis.temperature)}</span>
						<span>100 — 危険</span>
					</div>
				</div>

				<!-- Reason -->
				{#if analysis.reason}
					<p class="border-l-2 border-gray-700 pl-3 text-sm italic text-gray-300">
						{analysis.reason}
					</p>
				{/if}

				<!-- Rewrite reveal -->
				{#if analysis.danger && analysis.rewrite}
					<div class="space-y-1.5">
						<p class="text-xs font-medium uppercase tracking-wide text-gray-500">
							{phase === 'cooling' ? '冷静版（冷却中…）' : '✨ 冷静版'}
						</p>
						<div
							class={[
								'rounded-xl bg-gray-800 p-4 text-sm leading-relaxed transition-all duration-700',
								phase === 'cooling' && 'select-none blur-md opacity-20'
							]}
						>
							{analysis.rewrite}
						</div>
						{#if phase === 'cooling'}
							<p class="animate-pulse text-center text-xs text-gray-500">
								{formatMs(remaining)} 後にリビール
							</p>
						{/if}
					</div>
				{/if}

				<!-- Passthrough -->
				{#if !analysis.danger}
					<div
						class="flex items-center gap-2 rounded-xl border border-emerald-800 bg-emerald-950 p-3"
					>
						<span class="text-emerald-400">✓</span>
						<p class="text-sm text-emerald-300">低温です。変換不要 — そのまま送れます。</p>
					</div>
				{/if}

				<!-- Sent confirmation -->
				{#if phase === 'sent'}
					<div class="flex items-center gap-2 rounded-xl bg-gray-800 p-3">
						<span class="text-gray-400">📤</span>
						<p class="text-sm text-gray-300">送信済みとしてログに記録しました</p>
					</div>
				{/if}
			</section>
		{/if}

		<!-- Cooldown log -->
		{#if log.length > 0}
			<section class="space-y-2">
				<div class="flex items-center justify-between">
					<h2 class="text-xs font-medium uppercase tracking-wide text-gray-500">
						冷却ログ（{log.filter((e) => e.analysis.danger).length} 件）
					</h2>
					<button
						class="text-xs text-gray-600 transition-colors hover:text-gray-400"
						onclick={() => {
							log = [];
							saveLog();
						}}
					>
						クリア
					</button>
				</div>
				<div class="space-y-1.5">
					{#each log as entry (entry.id)}
						<div class="flex items-center gap-3 rounded-xl bg-gray-900 p-3">
							<!-- Mini temp bar -->
							<div class="w-14 shrink-0 space-y-0.5">
								<div class="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
									<div
										class="h-full rounded-full"
										style="width: {entry.analysis.temperature}%; background-color: {tempColor(entry.analysis.temperature)};"
									></div>
								</div>
								<p
									class="text-right font-mono text-xs font-bold"
									style="color: {tempColor(entry.analysis.temperature)}"
								>
									{entry.analysis.temperature}℃
								</p>
							</div>
							<!-- Message preview -->
							<p class="min-w-0 flex-1 truncate text-xs text-gray-400">{entry.text}</p>
							<!-- Time -->
							<time class="shrink-0 text-xs text-gray-600">
								{new Date(entry.sentAt).toLocaleTimeString('ja-JP', {
									hour: '2-digit',
									minute: '2-digit'
								})}
							</time>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<footer class="pb-6 text-center text-xs text-gray-700">
			最後に送るかは、あなたが決める。
		</footer>
	</div>
</main>
