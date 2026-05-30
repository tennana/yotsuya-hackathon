import { env } from '$env/dynamic/private';
import { json, type RequestHandler } from '@sveltejs/kit';
import OpenAI from 'openai';
import { z } from 'zod';
import { Category, Kind, type Category as CategoryType } from '$lib/events';

const RequestBody = z.object({
	text: z.string().min(1).max(2_000),
	kind: Kind,
	roomId: z.string().min(1).max(120).optional(),
	recentSentTexts: z.array(z.string().min(1).max(500)).max(2).optional()
});

const Classification = z.object({
	category: Category,
	intensity: z.number().min(0).max(1)
});

function heuristicClassify(text: string): z.infer<typeof Classification> {
	const normalized = text.toLowerCase();

	const scores: Record<CategoryType, number> = {
		不安: 0,
		反論: 0,
		質問: 0,
		納得: 0
	};

	for (const word of ['心配', '不安', '怖い', '難しい', '懸念', '大丈夫かな', '迷']) {
		if (normalized.includes(word)) scores.不安 += 1;
	}
	for (const word of ['でも', 'ただ', '反対', '違う', '納得でき', '微妙', 'リスク', '無理']) {
		if (normalized.includes(word)) scores.反論 += 1;
	}
	for (const word of ['?', '？', 'なぜ', 'どう', 'いつ', '誰', '質問', '確認']) {
		if (normalized.includes(word)) scores.質問 += 1;
	}
	for (const word of ['了解', '賛成', 'いいと思', 'なるほど', '納得', '大丈夫です', 'ok']) {
		if (normalized.includes(word)) scores.納得 += 1;
	}

	const category = (Object.entries(scores) as [CategoryType, number][]).reduce((best, next) =>
		next[1] > best[1] ? next : best
	)[0];
	const topScore = scores[category];

	return {
		category: topScore === 0 ? '不安' : category,
		intensity: Math.min(0.9, 0.45 + topScore * 0.15)
	};
}

function stabilizeForDemo(
	text: string,
	classification: z.infer<typeof Classification>,
	recentSentTexts: string[] = []
): z.infer<typeof Classification> {
	const normalized = text.toLowerCase();
	const context = recentSentTexts.join(' ').toLowerCase();
	const hasDisagreementCue = [
		'でも',
		'ただ',
		'しかし',
		'反対',
		'違う',
		'納得でき',
		'リスク',
		'無理',
		'本当に',
		'それでいい',
		'大丈夫なの'
	].some((word) => normalized.includes(word));
	const isQuestion = normalized.includes('?') || normalized.includes('？');
	const hasAgreementContext = ['いいと思', '賛成', '納得', '了解', '進めましょう', '大丈夫そう'].some(
		(word) => context.includes(word)
	);
	const hasChallengeQuestionCue = ['本当に', 'それでいい', '大丈夫', '問題ない'].some((word) =>
		normalized.includes(word)
	);

	if ((hasDisagreementCue && !isQuestion) || (isQuestion && hasAgreementContext && hasChallengeQuestionCue)) {
		return {
			category: '反論',
			intensity: Math.max(classification.intensity, 0.72)
		};
	}

	return classification;
}

async function classifyWithOpenAI(input: {
	text: string;
	kind: z.infer<typeof Kind>;
	recentSentTexts: string[];
}): Promise<z.infer<typeof Classification>> {
	const client = new OpenAI({
		apiKey: env.OPENAI_API_KEY,
		timeout: 4_000
	});

	const contextLines = input.recentSentTexts
		.slice(0, 2)
		.map((line, index) => `直前の発言${index + 1}: 「${line}」`)
		.join('\n');
	const userPrompt = [
		`対象テキスト: 「${input.text}」`,
		`イベント種別: ${input.kind}`,
		contextLines ? `文脈:\n${contextLines}` : '文脈: なし'
	].join('\n\n');

	const response = await client.chat.completions.create(
		{
			model: env.OPENAI_MODEL ?? 'gpt-4o-mini',
			response_format: { type: 'json_object' },
			messages: [
				{
					role: 'system',
					content:
						'あなたは会議発言分類器です。JSONのみ返す。\n' +
						'カテゴリ定義:\n' +
						'- 反論: 提案・結論への不同意、または疑義の提示。\n' +
						'- 質問: 情報取得が目的の中立的な問い。\n' +
						'- 不安: 結果・進行・リスクへの懸念。\n' +
						'- 納得: 賛同、理解、前進への同意。\n' +
						'直前文脈に賛同発言があり、その流れに疑義を投げる問いは反論を優先。\n' +
						'出力形式は {"category":"不安|反論|質問|納得","intensity":0.0}。前置き・説明・マークダウン禁止。'
				},
				{
					role: 'user',
					content: userPrompt
				}
			]
		},
		{ timeout: 4_000 }
	);

	const content = response.choices[0]?.message?.content ?? '';
	const jsonText = content
		.replace(/^```json\s*/i, '')
		.replace(/^```\s*/i, '')
		.replace(/\s*```$/i, '')
		.trim();

	return Classification.parse(JSON.parse(jsonText));
}

export const POST: RequestHandler = async ({ request }) => {
	let body: z.infer<typeof RequestBody>;

	try {
		body = RequestBody.parse(await request.json());
	} catch {
		return json({ category: '不安', intensity: 0.5 });
	}

	const recentSentTexts = body.recentSentTexts ?? [];

	if (!env.OPENAI_API_KEY) {
		return json(stabilizeForDemo(body.text, heuristicClassify(body.text), recentSentTexts));
	}

	try {
		return json(
			stabilizeForDemo(
				body.text,
				await classifyWithOpenAI({ text: body.text, kind: body.kind, recentSentTexts }),
				recentSentTexts
			)
		);
	} catch {
		return json(stabilizeForDemo(body.text, heuristicClassify(body.text), recentSentTexts));
	}
};
