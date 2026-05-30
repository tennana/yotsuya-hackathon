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

	async function emitClassified(kind: Kind, rawText: string) {
		const text = rawText.trim();
		if (!text) return;

		classifyStatus = `${KIND_LABEL[kind]}を分類中`;

		try {
			const classification = await classifyText(text, kind);
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
		}, 1_200);
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

<main class="min-h-screen bg-neutral-950 text-neutral-50">
	<div class="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-5 py-5 sm:px-8">
		<header class="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
			<div>
				<p class="text-xs tracking-[0.24em] text-amber-300 uppercase">Unsaid Board</p>
				<h1 class="mt-2 text-3xl font-semibold">参加者入力</h1>
				<p class="mt-1 text-sm text-neutral-400">Room: {roomId}</p>
			</div>
			<a
				class="rounded-md border border-white/15 px-4 py-2 text-sm text-neutral-100 hover:border-amber-300 hover:text-amber-200"
				href={resolve('/room/[id]/facilitator', { id: roomId })}
				target="_blank"
			>
				ファシリテーター画面
			</a>
		</header>

		<section class="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
			<div class="flex flex-col gap-4">
				<div class="rounded-md border border-white/10 bg-neutral-900 p-4">
					<label for="draft" class="text-sm font-medium text-neutral-200">
						チャットに書く内容
					</label>
					<textarea
						id="draft"
						class="mt-3 min-h-48 w-full resize-none rounded-md border border-white/10 bg-neutral-950 px-4 py-3 text-base leading-7 text-neutral-50 transition outline-none focus:border-amber-300"
						placeholder="例: でも、このまま進めるのは少しリスクがある気がします"
						value={draft}
						oninput={handleInput}
						onblur={handleBlur}
						onkeydown={handleKeydown}
					></textarea>
					<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
						<p class="text-sm text-neutral-400">
							未送信・削除・入力停止は本文を表示せず、分類結果だけ送信します。
						</p>
						<button
							class="rounded-md bg-amber-300 px-5 py-2 text-sm font-semibold text-neutral-950 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
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

				<div class="rounded-md border border-white/10 p-4">
					<h2 class="text-lg font-semibold">表面のチャット</h2>
					<div class="mt-3 space-y-2">
						{#if sentMessages.length === 0}
							<p class="text-sm text-neutral-500">まだ送信済みメッセージはありません。</p>
						{:else}
							{#each sentMessages as message, index (`${message.participantId}-${message.t}-${index}`)}
								<p class="rounded-md bg-white/5 px-3 py-2 text-sm text-neutral-200">
									{message.text}
								</p>
							{/each}
						{/if}
					</div>
				</div>
			</div>

			<aside class="space-y-3">
				<div class="rounded-md border border-white/10 p-4">
					<p class="text-xs tracking-[0.2em] text-neutral-500 uppercase">status</p>
					<p class="mt-2 text-sm text-neutral-200">{realtimeStatus}</p>
					<p class="mt-1 text-sm text-neutral-400">{classifyStatus}</p>
				</div>
				<div class="rounded-md border border-white/10 p-4">
					<h2 class="text-base font-semibold">デモ用トリガー</h2>
					<ul class="mt-3 space-y-2 text-sm text-neutral-400">
						<li>反論文を打って数秒止める</li>
						<li>長めに書いて一気に消す</li>
						<li>送信すると表面チャットに出る</li>
					</ul>
				</div>
			</aside>
		</section>
	</div>
</main>
