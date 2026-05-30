<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import {
		KIND_LABEL,
		SignalEvent,
		type Kind,
		type SignalEvent as SignalEventType
	} from '$lib/events';
	import { createBrowserSupabaseClient } from '$lib/supabase';
	import {
		broadcastSignal,
		classifyText,
		createSignalEvent,
		getParticipantId
	} from '$lib/sources/liveSource';
	import type { RealtimeChannel } from '@supabase/supabase-js';
	import { onMount } from 'svelte';

	const roomId = $derived(page.params.id ?? 'demo');

	let draft = $state('');
	let realtimeStatus = $state('接続準備中');
	let classifyStatus = $state('待機中');
	let sentMessages = $state<SignalEventType[]>([]);
	let channel = $state<RealtimeChannel | null>(null);

	let participantId = '';
	let idleTimer: ReturnType<typeof setTimeout> | undefined;
	let peakDraft = '';
	let lastHiddenSignature = '';
	let lastHesitationSignature = '';
	let suppressBlur = false;

	function clearIdleTimer() {
		if (idleTimer) clearTimeout(idleTimer);
		idleTimer = undefined;
	}

	function mapRealtimeStatus(status: string) {
		if (status === 'SUBSCRIBED') return 'Realtime 接続中';
		if (status === 'CHANNEL_ERROR') return 'Realtime エラー';
		if (status === 'TIMED_OUT') return 'Realtime タイムアウト';
		if (status === 'CLOSED') return 'Realtime 切断';
		return `Realtime ${status}`;
	}

	function recentSentContext() {
		return sentMessages
			.map((event) => event.text)
			.filter((text): text is string => Boolean(text))
			.slice(0, 2);
	}

	async function emitClassified(kind: Kind, rawText: string) {
		const text = rawText.trim();
		if (!text) return;

		classifyStatus = `${KIND_LABEL[kind]}を分類中`;

		try {
			const classification = await classifyText(text, kind, {
				roomId,
				recentSentTexts: recentSentContext()
			});
			const event = createSignalEvent({
				participantId,
				kind,
				classification,
				text
			});

			await broadcastSignal(channel, event);

			if (kind === 'sent') {
				sentMessages = [event, ...sentMessages].slice(0, 6);
			}

			classifyStatus = `${KIND_LABEL[kind]}: ${classification.category} ${Math.round(
				classification.intensity * 100
			)}%`;
		} catch {
			classifyStatus = '分類 API に接続できません';
		}
	}

	function emitHidden(kind: Extract<Kind, 'deleted' | 'hesitation'>, rawText: string) {
		const text = rawText.trim();
		if (text.length < 6) return;

		const signature = `${kind}:${text}`;
		if (signature === lastHiddenSignature) return;
		lastHiddenSignature = signature;

		void emitClassified(kind, text);
	}

	function scheduleHesitation() {
		clearIdleTimer();

		const snapshot = draft.trim();
		if (snapshot.length < 8) return;

		idleTimer = setTimeout(() => {
			const current = draft.trim();
			const signature = `hesitation:${current}`;
			if (current === snapshot && signature !== lastHesitationSignature) {
				lastHesitationSignature = signature;
				emitHidden('hesitation', current);
			}
		}, 4_000);
	}

	function handleInput(event: Event) {
		const next = (event.currentTarget as HTMLTextAreaElement).value;
		const previous = draft;

		draft = next;

		if (next.length > peakDraft.length) peakDraft = next;

		const previousText = previous.trim();
		const nextText = next.trim();
		const largeDrop = previousText.length >= 10 && previousText.length - nextText.length >= 8;

		if (largeDrop) {
			const captured = peakDraft.trim().length >= previousText.length ? peakDraft : previous;
			emitHidden('deleted', captured);
			peakDraft = next;
		}

		scheduleHesitation();
	}

	function handleBlur() {
		if (suppressBlur) {
			suppressBlur = false;
			return;
		}

		const text = draft.trim();
		if (text.length < 6) return;

		emitHidden('deleted', text);
		draft = '';
		peakDraft = '';
		clearIdleTimer();
	}

	async function send() {
		const text = draft.trim();
		if (!text) return;

		suppressBlur = true;
		draft = '';
		peakDraft = '';
		clearIdleTimer();
		await emitClassified('sent', text);
		setTimeout(() => {
			suppressBlur = false;
		});
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			void send();
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

	onMount(() => {
		participantId = getParticipantId();

		const client = createBrowserSupabaseClient();
		if (!client) {
			realtimeStatus = 'Supabase 環境変数が未設定';
			return;
		}

		const nextChannel = client
			.channel(`room:${roomId}`, {
				config: {
					broadcast: { self: false }
				}
			})
			.on('broadcast', { event: 'signal' }, ({ payload }) => {
				const parsed = SignalEvent.safeParse(payload);
				if (!parsed.success || parsed.data.kind !== 'sent') return;
				sentMessages = [parsed.data, ...sentMessages].slice(0, 6);
			});

		nextChannel.subscribe((status) => {
			realtimeStatus = mapRealtimeStatus(status);
		});

		channel = nextChannel;

		return () => {
			clearIdleTimer();
			void client.removeChannel(nextChannel);
		};
	});
</script>

<svelte:head>
	<title>参加者入力 | 場温計</title>
</svelte:head>

<main class="min-h-dvh bg-neutral-950 text-neutral-50">
	<div class="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-3 py-3 sm:px-5 sm:py-4">
		<header class="rounded-xl border border-white/10 bg-neutral-900/70 px-4 py-3 backdrop-blur">
			<div class="flex items-center justify-between gap-3">
				<div>
					<p class="text-[11px] tracking-[0.2em] text-amber-300 uppercase">Unsaid Board</p>
					<h1 class="mt-1 text-xl font-semibold sm:text-2xl">参加者チャット</h1>
					<p class="mt-1 text-xs text-neutral-400">Room: {roomId}</p>
				</div>
				<a
					class="shrink-0 rounded-lg border border-white/20 px-3 py-2 text-xs text-neutral-100 hover:border-amber-300 hover:text-amber-200"
					href={resolve('/room/[id]/facilitator', { id: roomId })}
					target="_blank"
				>
					ファシリ画面
				</a>
			</div>
			<div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
				<span>{realtimeStatus}</span>
				<span>{classifyStatus}</span>
			</div>
		</header>

		<section class="mt-3 flex flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-neutral-900">
			<div class="flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-4">
				{#if sentMessages.length === 0}
					<div class="rounded-xl border border-dashed border-white/10 bg-neutral-950/60 px-4 py-6 text-center">
						<p class="text-sm text-neutral-400">まだメッセージはありません</p>
					</div>
				{:else}
					{#each sentMessages.slice().reverse() as message, index (`${message.participantId}-${message.t}-${index}`)}
						{@const isOwn = message.participantId === participantId}
						<div class={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
							<div
								class={`max-w-[85%] rounded-2xl px-3 py-2 sm:max-w-[75%] ${
									isOwn ? 'bg-amber-300 text-neutral-950' : 'bg-white/8 text-neutral-100'
								}`}
							>
								<div class="mb-1">
									<span
										class={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${sourceStyle(message.participantId)}`}
									>
										{sourceLabel(message.participantId)}
									</span>
								</div>
								<p class="text-sm leading-6">{message.text}</p>
							</div>
						</div>
					{/each}
				{/if}
			</div>

			<div class="border-t border-white/10 bg-neutral-900 px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
				<label for="draft" class="sr-only">メッセージ入力</label>
				<textarea
					id="draft"
					class="min-h-24 w-full resize-none rounded-xl border border-white/15 bg-neutral-950 px-4 py-3 text-base leading-7 text-neutral-50 outline-none focus:border-amber-300"
					placeholder="メッセージを入力"
					value={draft}
					oninput={handleInput}
					onblur={handleBlur}
					onkeydown={handleKeydown}
				></textarea>
				<div class="mt-2 flex items-center justify-between gap-3">
					<p class="text-[11px] text-neutral-500">入力停止の判定は約4秒です</p>
					<button
						class="rounded-xl bg-amber-300 px-5 py-2 text-sm font-semibold text-neutral-950 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
						type="button"
						disabled={!draft.trim()}
						onmousedown={() => {
							suppressBlur = true;
						}}
						onclick={() => void send()}
					>
						送信
					</button>
				</div>
			</div>
		</section>
	</div>
</main>
