import { z } from 'zod';

export const CATEGORIES = ['不安', '反論', '質問', '納得'] as const;

export const Category = z.enum(CATEGORIES);
export const Kind = z.enum(['hesitation', 'deleted', 'sent']);

export const SignalEvent = z.object({
	participantId: z.string(),
	kind: Kind,
	category: Category.optional(),
	intensity: z.number().min(0).max(1),
	text: z.string().optional(),
	t: z.number()
});

export type Category = z.infer<typeof Category>;
export type Kind = z.infer<typeof Kind>;
export type SignalEvent = z.infer<typeof SignalEvent>;

export const KIND_LABEL: Record<Kind, string> = {
	hesitation: '入力停止',
	deleted: '未送信',
	sent: '送信済み'
};
