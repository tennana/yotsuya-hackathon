import { z } from 'zod';

export const AnalysisSchema = z.object({
	temperature: z.number().int().min(0).max(100),
	danger: z.boolean(),
	reason: z.string(),
	rewrite: z.string()
});
export type Analysis = z.infer<typeof AnalysisSchema>;

export interface LogEntry {
	id: string;
	text: string;
	analysis: Analysis;
	sentAt: number;
}
