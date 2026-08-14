import { css } from 'lit';

export const sharedStyles = css`
	:host {
		color: #24292f;
		font: 13px/1.4 system-ui, sans-serif;
	}
`;

export function formatTiming(value: number | null): string {
	return value === null ? '-' : `${value.toFixed(1)} ms`;
}
