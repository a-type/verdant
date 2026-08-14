import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { QueryRun } from '../lib/diagnostics.js';
import { formatTiming, sharedStyles } from '../lib/format.js';

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
				min-width: 520px;
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
			}
			.hydration {
				background: hsl(var(--hue) 65% 72%);
				height: 100%;
				position: absolute;
			}
			.axis {
				color: #57606a;
				display: flex;
				font-size: 11px;
				justify-content: space-between;
				margin-top: 5px;
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
		const start = Math.min(...validRuns.map((run) => run.startedAt));
		const end = Math.max(
			...validRuns.map((run) => run.startedAt + (run.total ?? 0)),
			start + 1,
		);
		const range = end - start;
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
		return html`<div class="timeline">
			<div class="track" style=${`height:${lanes.length * 26}px`}>
				${positionedRuns.map(({ run, lane }) => {
					const total = Math.max(run.total ?? 0, 1);
					const left = ((run.startedAt - start) / range) * 100;
					const width = (total / range) * 100;
					const sweep = ((run.sweep ?? 0) / total) * 100;
					return html`<button
						class="run"
						style=${`--hue:${this.hue(run.key)};left:${left}%;top:${lane * 26}px;width:${Math.max(width, 0.4)}%`}
						title=${`${run.key} | started ${new Date(run.startedAt).toLocaleTimeString()} | sweep ${formatTiming(run.sweep)} | hydrate ${formatTiming(run.hydration)} | total ${formatTiming(run.total)}`}
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
			<div class="axis">
				<span>${new Date(start).toLocaleTimeString()}</span
				><span>${new Date(end).toLocaleTimeString()}</span>
			</div>
		</div>`;
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
