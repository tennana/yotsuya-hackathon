<!--
  発表スライドのデッキ定義。テーマ決定後はこのファイルだけを編集すれば資料が完成します。

  使い方:
  - <Deck> の中の {#snippet slides()} 内に、レイアウト部品を「上から表示順」に並べるだけ。
  - 利用できる部品（$lib/slides からインポート）:
      <Title title subtitle? />              表紙・章扉
      <Statement text />                      大きな一言・キャッチ
      <Bullets heading items={[...]} />       箇条書き
      <TwoColumn heading? {left} {right} />    左右2カラム（left/right は {#snippet} で渡す）
      <Code code lang? caption? />            コード提示
      <Image src alt caption? />              画像（static/ 配下を /xxx.png で参照）
      <Demo heading?>...</Demo>               ライブデモ（中の要素はクリックしても次へ進まない）
  - 操作: → / Space / PageDown=次, ← / PageUp=前, Home/End=先頭/末尾, 背景クリック=次。
    URL の #3 で3枚目に直接移動でき、リロードしても位置が保持されます。
  - <Demo> の中には完成したプロダクトのコンポーネントをそのまま置けます（例: <MyFeature />）。
-->
<script lang="ts">
	import { Deck, Title, Statement, Bullets, TwoColumn, Demo } from '$lib/slides';

	// Demo スライド用のプレースホルダ（本番では実コンポーネントに差し替え）。
	let count = $state(0);
</script>

<Deck>
	{#snippet slides()}
		<Title title="プロダクト名" subtitle="一言で伝わるキャッチコピー" />

		<Statement text="〇〇な人は、△△に困っている。" />

		<Bullets
			heading="解決策"
			items={[
				'プロダクトが提供する価値その1',
				'価値その2',
				'価値その3'
			]}
		/>

		<Demo heading="ライブデモ">
			<div class="flex flex-col items-center gap-6">
				<p class="text-4xl">ここに実際のプロダクト画面を埋め込みます</p>
				<button
					class="rounded-lg bg-indigo-500 px-8 py-4 text-3xl font-bold hover:bg-indigo-400"
					onclick={() => count++}
				>
					クリック数: {count}
				</button>
			</div>
		</Demo>

		<TwoColumn heading="技術構成">
			{#snippet left()}
				<h3 class="text-2xl font-bold text-white/50">フロント</h3>
				<p>SvelteKit / Tailwind</p>
			{/snippet}
			{#snippet right()}
				<h3 class="text-2xl font-bold text-white/50">バック</h3>
				<p>Cloudflare Workers / Supabase</p>
			{/snippet}
		</TwoColumn>

		<Bullets
			heading="工夫・差別化ポイント"
			items={['ここが新しい', 'ここが速い', 'ここが使いやすい']}
		/>

		<Bullets
			heading="今後の展望"
			items={['次にやること', '広げたい方向']}
		/>

		<Statement text="ご清聴ありがとうございました。" />
	{/snippet}
</Deck>
