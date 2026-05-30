import { env } from '$env/dynamic/private';
import { json, type RequestHandler } from '@sveltejs/kit';
import OpenAI from 'openai';
import { z } from 'zod';
import { Category, Kind, type Category as CategoryType } from '$lib/events';

const RequestBody = z.object({
	text: z.string().min(1).max(2_000),
	kind: Kind
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
	classification: z.infer<typeof Classification>
): z.infer<typeof Classification> {
	const normalized = text.toLowerCase();
	const hasDisagreementCue = [
		'でも',
		'ただ',
		'しかし',
		'反対',
		'違う',
		'納得でき',
		'リスク',
		'無理'
	].some((word) => normalized.includes(word));
	const isQuestion = normalized.includes('?') || normalized.includes('？');

	if (hasDisagreementCue && !isQuestion) {
		return {
			category: '反論',
			intensity: Math.max(classification.intensity, 0.72)
		};
	}

	return classification;
}

async function classifyWithOpenAI(text: string): Promise<z.infer<typeof Classification>> {
	const client = new OpenAI({
		apiKey: env.OPENAI_API_KEY,
		timeout: 4_000
	});

	const response = await client.chat.completions.create(
		{
			model: env.OPENAI_MODEL ?? 'gpt-4o-mini',
			response_format: { type: 'json_object' },
			messages: [
				{
					role: 'system',
					content:
						'あなたは会議の未送信テキストを分類する。入力文を読み、{"category":"不安|反論|質問|納得","intensity":0.0} の JSON のみを返す。前置き・マークダウン禁止。category は "不安"|"反論"|"質問"|"納得" のいずれか。intensity は感情の強さ 0.0〜1.0。本文は分類後に破棄され、保存されない。'
				},
				{
					role: 'user',
					content: text
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

	if (!env.OPENAI_API_KEY) return json(stabilizeForDemo(body.text, heuristicClassify(body.text)));

	try {
		return json(stabilizeForDemo(body.text, await classifyWithOpenAI(body.text)));
	} catch {
		return json(stabilizeForDemo(body.text, heuristicClassify(body.text)));
	}
};
