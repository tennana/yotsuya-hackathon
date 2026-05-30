<script lang="ts">
	import { Deck, Slide, TwoColumn, Demo } from '$lib/slides';
	import FacilitatorBoard from '$lib/components/FacilitatorBoard.svelte';
</script>

{#snippet unsentBubbleImage()}
	<div class="relative h-full min-h-[520px] w-full overflow-hidden rounded-md border border-white/10 bg-neutral-950 p-8">
		<div class="absolute inset-x-8 top-8 rounded-md border border-white/10 bg-neutral-900/75 p-5">
			<p class="text-base text-neutral-400">表面のチャット</p>
			<div class="mt-4 space-y-3">
				<div class="w-fit rounded-md border-l-2 border-emerald-300/70 bg-white/5 px-4 py-3">
					<p class="text-2xl text-neutral-100">なるほど、方向性は理解しました。</p>
				</div>
				<div class="w-fit rounded-md border-l-2 border-emerald-300/70 bg-white/5 px-4 py-3">
					<p class="text-2xl text-neutral-100">一旦それで進めましょう。</p>
				</div>
			</div>
		</div>

		<div class="absolute inset-x-8 bottom-8 h-64 rounded-md border border-dashed border-amber-200/25 bg-amber-50/[0.03] p-5 shadow-[inset_0_0_60px_rgba(251,146,60,0.08)]">
			<div class="flex items-center justify-between gap-4">
				<p class="text-base text-amber-100/70">送られなかった気配</p>
				<p class="text-sm text-neutral-500">会議は平和。でも下書き欄はざわついている。</p>
			</div>

			<div class="ghost-bubble left-[8%] top-[38%] [animation-delay:0s]">
				<span>未送信</span>
				<p>来週は無理では？</p>
			</div>
			<div class="ghost-bubble left-[38%] top-[22%] [animation-delay:1.4s]">
				<span>削除済み</span>
				<p>QA終わってませんよね？</p>
			</div>
			<div class="ghost-bubble left-[58%] top-[50%] [animation-delay:2.8s]">
				<span>入力停止</span>
				<p>誰が障害対応するんですか？</p>
			</div>
		</div>

		<p class="absolute bottom-3 left-8 text-sm text-neutral-500">
			本文は保存せず、分類後すぐに破棄。個人名は出さず、場の温度だけを集計。
		</p>
	</div>
{/snippet}

<Deck>
	{#snippet slides()}
		<Slide>
			<div class="flex h-full flex-col items-center justify-center gap-8 text-center">
				<p class="text-7xl font-bold tracking-tight">
					<ruby>場温計<rt class="text-3xl font-medium text-white/70">ばおんけい</rt></ruby>
				</p>
				<p class="max-w-5xl text-6xl font-bold leading-tight tracking-tight text-balance">
					その「了解です」、<br />本当に了解ですか？
				</p>
				<p class="text-2xl text-white/60">
					Unsaid Board — 送られなかった本音を、会議の温度にする
				</p>
			</div>
		</Slide>

		<Slide>
			<div class="flex h-full flex-col items-center justify-center gap-10 text-center">
				<p class="max-w-5xl text-6xl font-bold leading-tight tracking-tight text-balance">
					会議の沈黙は、合意とは限らない。
				</p>
				<p class="max-w-4xl text-4xl leading-snug text-white/70 text-balance">
					全員うなずいている。<br />でもSlackの下書き欄は荒れている。
				</p>
			</div>
		</Slide>

		<TwoColumn heading="送られなかった本音、だいたいここにいる">
			{#snippet left()}
				<div class="space-y-5">
					<p class="text-xl font-semibold tracking-[0.14em] text-emerald-200/80 uppercase">
						表の発言
					</p>
					<div class="w-fit rounded-md border-l-2 border-emerald-300/70 bg-white/5 px-5 py-4">
						<p>「なるほど、方向性は理解しました。」</p>
					</div>
				</div>
			{/snippet}
			{#snippet right()}
				<div class="space-y-5">
					<p class="text-xl font-semibold tracking-[0.14em] text-amber-200/80 uppercase">
						裏の下書き
					</p>
					<div class="space-y-4 text-[2rem] leading-snug">
						<p>「で、誰がやるんですか？」</p>
						<p>「来週リリースはさすがに魔法」</p>
						<p>「今の説明、正直わからないです」</p>
						<p>「それ前回も決めませんでした？」</p>
					</div>
					<p class="pt-3 text-xl text-white/55">
						場温計は、この“裏”を本文なしで温度にする。
					</p>
				</div>
			{/snippet}
		</TwoColumn>

		<Demo heading="送られなかった気配は、発言ログではない">
			{@render unsentBubbleImage()}
		</Demo>

		<Demo heading="実演：表面は合意、裏では静かな炎上">
			<div class="flex h-full w-full flex-col gap-5">
				<p class="text-center text-3xl font-semibold text-amber-200/90">
					静かな会議ほど、あとで燃える。
				</p>
				<FacilitatorBoard roomId="demo" embedded />
			</div>
		</Demo>

		<TwoColumn heading="どうやって“空気”を数値にするか">
			{#snippet left()}
				<div class="space-y-2 text-2xl leading-snug">
					<h3 class="text-xl font-bold text-white/50">入力で拾う</h3>
					<p>1. 書いて消した文や、止まった入力を信号として拾う</p>
					<p>2. 本文はその場で AI が分類する</p>
					<p>3. 分類後、本文は保存せずに破棄する</p>
				</div>
			{/snippet}
			{#snippet right()}
				<div class="space-y-2 text-2xl leading-snug">
					<h3 class="text-xl font-bold text-white/50">温度に変える</h3>
					<p>4. 反論 / 不安 / 質問 / 納得 に分ける</p>
					<p>5. 同じカテゴリが重なると温度が上がる</p>
					<p>6. 時間がたつと少しずつ冷える</p>
					<p>7. 個人ではなく、その場の傾向だけを見る</p>
				</div>
			{/snippet}
		</TwoColumn>

		<Slide>
			<div class="flex h-full flex-col items-center justify-center gap-10 text-center">
				<p class="text-6xl font-bold leading-tight tracking-tight text-balance">
					そして会議は沈黙した
				</p>
				<div class="space-y-3 text-2xl text-white/65">
					<p>SvelteKit / Svelte 5 runes</p>
					<p>Cloudflare Workers</p>
					<p>Supabase Realtime</p>
					<p>OpenAI gpt-4o-mini</p>
				</div>
			</div>
		</Slide>
	{/snippet}
</Deck>

<style>
	.ghost-bubble {
		position: absolute;
		max-width: 24rem;
		border: 1px dashed rgb(251 191 36 / 0.34);
		border-radius: 0.5rem;
		background: rgb(255 255 255 / 0.08);
		padding: 0.9rem 1.1rem;
		color: rgb(255 251 235 / 0.78);
		filter: blur(0.1px);
		box-shadow: 0 0 30px rgb(251 146 60 / 0.13);
		opacity: 0;
		animation: ghost-rise 4.2s ease-in-out infinite;
	}

	.ghost-bubble span {
		display: inline-flex;
		margin-bottom: 0.35rem;
		border-radius: 999px;
		border: 1px solid rgb(251 191 36 / 0.25);
		padding: 0.12rem 0.55rem;
		font-size: 0.72rem;
		color: rgb(253 230 138 / 0.78);
	}

	.ghost-bubble p {
		font-size: 1.55rem;
		line-height: 1.35;
	}

	@keyframes ghost-rise {
		0% {
			opacity: 0;
			transform: translateY(18px) scale(0.98);
		}
		18% {
			opacity: 0.7;
			transform: translateY(0) scale(1);
		}
		58% {
			opacity: 0.38;
		}
		100% {
			opacity: 0;
			transform: translateY(-30px) scale(1.01);
		}
	}
</style>
