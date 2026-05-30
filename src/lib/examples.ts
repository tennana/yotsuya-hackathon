import type { Analysis } from './schema.js';

export interface Preset {
	label: string;
	text: string;
	analysis: Analysis;
}

export const PRESETS: Preset[] = [
	{
		label: '🔥 既読無視（高温）',
		text: 'なんで無視すんの？まじで意味わかんない',
		analysis: {
			temperature: 88,
			danger: true,
			reason: '攻撃的な言葉が相手を防衛的にさせ、関係悪化の恐れがあります',
			rewrite: '返信がなくて少し不安になっています。時間があるときに話せますか？'
		}
	},
	{
		label: '💢 仕事催促（高温）',
		text: 'これいつになんの？何回言えばわかるの？',
		analysis: {
			temperature: 82,
			danger: true,
			reason: '責め口調が相手を萎縮させ、建設的な対話が困難になります',
			rewrite: '進捗を教えてもらえますか？スケジュールを一緒に確認したいです'
		}
	},
	{
		label: '✅ 穏やかな文（素通し）',
		text: '了解です、ありがとうございます！',
		analysis: {
			temperature: 12,
			danger: false,
			reason: '穏やかで問題ありません',
			rewrite: ''
		}
	},
	{
		label: '🌡️ 境界線（中温）',
		text: '正直、ちょっと傷ついたんだけど',
		analysis: {
			temperature: 58,
			danger: false,
			reason: '感情を伝える文ですが、攻撃性は低いです',
			rewrite: ''
		}
	}
];

/** API 失敗時のオフラインフォールバック */
export function findCachedAnalysis(text: string): Analysis | null {
	return PRESETS.find((p) => p.text.trim() === text.trim())?.analysis ?? null;
}
