import type { SignalEvent } from '../events';

type DemoTimelineEvent = Omit<SignalEvent, 't'> & { at: number };
type Emit = (event: SignalEvent) => void;

export const DEMO_TIMELINE: DemoTimelineEvent[] = [
	{
		at: 0,
		participantId: 'demo-a',
		kind: 'sent',
		category: '納得',
		intensity: 0.16,
		text: 'なるほど、方向性は理解しました。'
	},
	{
		at: 2_200,
		participantId: 'demo-b',
		kind: 'sent',
		category: '納得',
		intensity: 0.16,
		text: '一旦それで進めましょう。'
	},
	{
		at: 3_800,
		participantId: 'demo-c',
		kind: 'unsent',
		category: '反論',
		intensity: 0.68,
		text: '来週は無理では？'
	},
	{
		at: 5_200,
		participantId: 'demo-d',
		kind: 'deleted',
		category: '不安',
		intensity: 0.62,
		text: 'QA終わってませんよね？'
	},
	{
		at: 6_600,
		participantId: 'demo-e',
		kind: 'hesitation',
		category: '質問',
		intensity: 0.82,
		text: '誰が障害対応するんですか？'
	},
	{
		at: 8_000,
		participantId: 'demo-f',
		kind: 'unsent',
		category: '反論',
		intensity: 0.66,
		text: 'また現場に丸投げですか？'
	},
	{
		at: 9_400,
		participantId: 'demo-g',
		kind: 'hesitation',
		category: '不安',
		intensity: 0.6,
		text: '今の説明、正直わからないです'
	}
];

export function createDemoSource() {
	let timers: ReturnType<typeof setTimeout>[] = [];

	function stop() {
		for (const timer of timers) clearTimeout(timer);
		timers = [];
	}

	function start(emit: Emit, onDone?: () => void) {
		stop();

		for (const item of DEMO_TIMELINE) {
			const timer = setTimeout(() => {
				emit({
					participantId: item.participantId,
					kind: item.kind,
					category: item.category,
					intensity: item.intensity,
					text: item.text,
					t: Date.now()
				});
			}, item.at);
			timers.push(timer);
		}

		const last = Math.max(...DEMO_TIMELINE.map((event) => event.at));
		timers.push(
			setTimeout(() => {
				timers = [];
				onDone?.();
			}, last + 300)
		);
	}

	return {
		start,
		stop,
		reset: start
	};
}
