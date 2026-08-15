import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { QueryRun } from '../lib/diagnostics.js';
import { formatTimestamp, formatTiming, sharedStyles } from '../lib/format.js';

export type TimelineRun = QueryRun;

@customElement('verdant-query-timeline')
export class VerdantQueryTimeline extends LitElement {
	static styles = [
		sharedStyles,
		css`
			:host {
				display: block;
				overflow-y: auto;
				max-height: 300px;
			}
			.timeline {
				background: #f6f8fa;
				border: 1px solid #d0d7de;
				min-height: 90px;
				overflow-x: auto;
				padding: 12px;
			}
			.track {
				min-width: 100%;
				position: relative;
				min-height: 6px;
			}
			.run {
				border: 0;
				cursor: pointer;
				height: 6px;
				padding: 0;
				position: absolute;
			}
			.run:hover,
			.run:focus-visible {
				outline: 2px solid #24292f;
				outline-offset: 2px;
			}
			.sweep {
				background: hsl(var(--hue) 65% 58%);
				height: 100%;
				position: absolute;
				left: 0;
				top: 0;
			}
			.hydration {
				background: hsl(var(--hue) 65% 72%);
				height: 100%;
				position: absolute;
				top: 0;
			}
			.axis {
				color: #57606a;
				display: flex;
				font-size: 11px;
				justify-content: space-between;
				margin-top: 5px;
			}
			.gap {
				align-items: center;
				background: #eaeef2;
				border-left: 1px dashed #8c959f;
				border-right: 1px dashed #8c959f;
				color: #57606a;
				display: flex;
				font-size: 10px;
				justify-content: center;
				overflow: hidden;
				position: absolute;
				white-space: nowrap;
			}
			p {
				color: #57606a;
				margin: 0;
			}
		`,
	];

	@property({ attribute: false })
	runs: TimelineRun[] = [];

	render() {
		const validRuns = this.runs.filter((run) => Number.isFinite(run.startedAt));
		if (validRuns.length === 0) return html`<p>No query runs yet.</p>`;
		const orderedRuns = [...validRuns].sort(
			(a, b) => a.startedAt - b.startedAt,
		);
		const start = orderedRuns[0].startedAt;
		const pixelsPerMillisecond = 0.5;
		const collapsedGapThreshold = 1000;
		const collapsedGapWidth = 32;
		let cursor = 0;
		let previousStart = start;
		const layout = orderedRuns.map((run) => {
			const gap = run.startedAt - previousStart;
			let gapMarker: { left: number; width: number; duration: number } | null =
				null;
			if (gap > 0) {
				const width =
					gap >= collapsedGapThreshold
						? collapsedGapWidth
						: gap * pixelsPerMillisecond;
				if (gap >= collapsedGapThreshold) {
					gapMarker = { left: cursor, width, duration: gap };
				}
				cursor += width;
			}
			const item = { run, left: cursor };
			previousStart = run.startedAt;
			return { ...item, gapMarker };
		});
		const lanes: number[] = [];
		const positionedRuns = [...validRuns]
			.sort((a, b) => a.startedAt - b.startedAt)
			.map((run) => {
				const runEnd = run.startedAt + Math.max(run.total ?? 0, 1);
				const lane = lanes.findIndex((laneEnd) => laneEnd <= run.startedAt);
				if (lane === -1) {
					lanes.push(runEnd);
					return { run, lane: lanes.length - 1 };
				}
				lanes[lane] = runEnd;
				return { run, lane };
			});
		const timelineWidth = Math.max(
			...layout.map(
				({ run, left }) =>
					left + Math.max((run.total ?? 0) * pixelsPerMillisecond, 6),
			),
			1,
		);
		return html`<div class="timeline">
			<div
				class="track"
				style=${`height:${lanes.length * 26}px;width:${timelineWidth}px`}
			>
				${layout.map(({ run, left, gapMarker }) => {
					const lane =
						positionedRuns.find((item) => item.run === run)?.lane ?? 0;
					const total = Math.max(run.total ?? 0, 1);
					const width = Math.max(total * pixelsPerMillisecond, 6);
					const sweep = ((run.sweep ?? 0) / total) * 100;
					return html`${gapMarker
							? html`<span
									class="gap"
									style=${`left:${gapMarker.left}px;top:0;width:${gapMarker.width}px;height:${lanes.length * 26}px`}
									>${this.formatGap(gapMarker.duration)}</span
								>`
							: ''}<button
							class="run"
							style=${`--hue:${this.hue(run.key)};left:${left}px;top:${lane * 26}px;width:${width}px`}
							title=${`${run.key} | started ${formatTimestamp(run.startedAt)} | sweep ${formatTiming(run.sweep)} | hydrate ${formatTiming(run.hydration)} | total ${formatTiming(run.total)}`}
							@click=${() => this.select(run.key)}
						>
							<span class="sweep" style=${`width:${sweep}%`}></span
							><span
								class="hydration"
								style=${`left:${sweep}%;width:${100 - sweep}%`}
							></span>
						</button>`;
				})}
			</div>
			<div
				class="axis"
				style=${`width:${timelineWidth}px`}
			>
				<span>${formatTimestamp(start)}</span
				><span
					>${formatTimestamp(
						orderedRuns[orderedRuns.length - 1].startedAt +
							Math.max(orderedRuns[orderedRuns.length - 1].total ?? 0, 0),
					)}</span
			</div>
		</div>`;
	}

	private formatGap(duration: number) {
		return duration >= 60000
			? `${(duration / 60000).toFixed(1)}m`
			: `${(duration / 1000).toFixed(1)}s`;
	}

	private hue(key: string) {
		let hash = 0;
		for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) | 0;
		return Math.abs(hash) % 360;
	}

	private select(key: string) {
		this.dispatchEvent(
			new CustomEvent('query-timeline-select', {
				bubbles: true,
				composed: true,
				detail: key,
			}),
		);
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'verdant-query-timeline': VerdantQueryTimeline;
	}
}
