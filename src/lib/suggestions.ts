import { CATEGORIES, type Category } from './events';
import type { Temperatures } from './thermo';

export interface Suggestion {
	id: string;
	category: Category;
	text: string;
	temp: number;
	t: number;
}

const SUGGESTION_TEXT: Record<Category, string> = {
	反論: '反論の温度が上がっています。匿名で懸念を集めましょう。',
	不安: '不安が高まっています。一度立ち止まって確認しませんか？',
	質問: '質問が溜まっています。Q&Aの時間を取りましょう。',
	納得: '納得が広がっています。次の論点へ進めそうです。'
};

export function createSuggestionEngine(options: { threshold?: number; cooldownMs?: number } = {}) {
	const threshold = options.threshold ?? 70;
	const cooldownMs = options.cooldownMs ?? 20_000;
	const previous: Record<Category, number> = {
		不安: 0,
		反論: 0,
		質問: 0,
		納得: 0
	};
	const lastFired: Record<Category, number> = {
		不安: 0,
		反論: 0,
		質問: 0,
		納得: 0
	};

	return {
		evaluate(temps: Temperatures, now = Date.now()): Suggestion[] {
			const suggestions: Suggestion[] = [];

			for (const category of CATEGORIES) {
				const temp = temps[category];
				const crossed = previous[category] <= threshold && temp > threshold;
				const cooledDown = now - lastFired[category] >= cooldownMs;

				if (crossed && cooledDown) {
					lastFired[category] = now;
					suggestions.push({
						id: `${category}-${now}`,
						category,
						text: SUGGESTION_TEXT[category],
						temp,
						t: now
					});
				}

				previous[category] = temp;
			}

			return suggestions;
		},
		reset() {
			for (const category of CATEGORIES) {
				previous[category] = 0;
				lastFired[category] = 0;
			}
		}
	};
}
