import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import OpenAI from 'openai';
import { AnalysisSchema } from '$lib/schema.js';
import { findCachedAnalysis } from '$lib/examples.js';

const SYSTEM_PROMPT = `あなたは送信前のメッセージを評価するアシスタント。
入力文を読み、{temperature, danger, reason, rewrite} の JSON のみを返す。前置き・マークダウン禁止。
- temperature: 攻撃性・怒りの強さ 0〜100。
- danger: 今送ると人間関係を損なう恐れがあれば true。穏当なら false。
- reason: なぜ危険か（日本語1行・短く）。
- rewrite: 送り手の本当の気持ちや要望を保ったまま、相手を責めない冷静な言い換え。
          単に丁寧にするのではなく、根底にある感情（不安・寂しさ等）と要望を言語化する。
danger が false の場合は rewrite を空文字列 "" にする。`;

export const POST: RequestHandler = async ({ request, platform }) => {
	const body = (await request.json().catch(() => ({}))) as { text?: string };
	const text = body?.text ?? '';

	if (!text.trim()) {
		return json({ ok: false, error: 'text required' }, { status: 400 });
	}

	const apiKey = platform?.env?.OPENAI_API_KEY;

	if (!apiKey) {
		const cached = findCachedAnalysis(text);
		if (cached) return json({ ok: true, analysis: cached });
		return json({ ok: false, error: 'API key not configured' }, { status: 503 });
	}

	try {
		const client = new OpenAI({ apiKey, timeout: 5000 });
		const completion = await client.chat.completions.create({
			model: 'gpt-4o-mini',
			response_format: { type: 'json_object' },
			messages: [
				{ role: 'system', content: SYSTEM_PROMPT },
				{ role: 'user', content: text.trim() }
			],
			max_tokens: 300
		});

		const raw = JSON.parse(completion.choices[0]?.message?.content ?? '{}');
		const analysis = AnalysisSchema.parse(raw);
		return json({ ok: true, analysis });
	} catch {
		const cached = findCachedAnalysis(text);
		if (cached) return json({ ok: true, analysis: cached });
		return json({
			ok: true,
			analysis: { temperature: 50, danger: false, reason: '', rewrite: '' }
		});
	}
};
