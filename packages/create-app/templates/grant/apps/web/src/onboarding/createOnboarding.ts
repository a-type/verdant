import { useEffectOnce } from '@/hooks/useEffectOnce.js';
import { useCallback, useEffect, useRef } from 'react';
import { proxy, subscribe, useSnapshot } from 'valtio';

type StringTuple = readonly string[];
export type Onboarding<Steps extends StringTuple> = {
	useBegin: () => () => void;
	useSkip: () => () => void;
	useStep: (
		name: Steps[number],
	) => readonly [boolean, () => void, boolean, boolean];
	useCancel: () => () => void;
	begin: () => void;
	skip: () => void;
	cancel: () => void;
};

export function createOnboarding<Steps extends StringTuple>(
	name: string,
	steps: Steps,
	startImmediately?: boolean,
): Onboarding<Steps> {
	const stepUnmounted: Record<string, boolean> = {};

	const activeStateStr =
		typeof window !== 'undefined'
			? localStorage.getItem(`onboarding-${name}`)
			: null;
	let activeState: Steps[number] | 'complete' | null = startImmediately
		? steps[0]
		: null;
	if (activeStateStr) {
		if (activeStateStr === 'complete') activeState = 'complete';
		else activeState = steps.find((step) => step === activeStateStr) ?? null;
	}

	const state = proxy({
		active: activeState,
	});

	subscribe(state, () => {
		if (typeof window !== 'undefined') {
			if (state.active) {
				localStorage.setItem(`onboarding-${name}`, state.active);
			} else {
				localStorage.removeItem(`onboarding-${name}`);
			}
		}
	});

	function useBegin() {
		return useCallback(() => {
			if (state.active === null) {
				console.debug('Begin onboarding', name);
				state.active = steps[0];
			}
		}, []);
	}
	function useSkip() {
		return useCallback(() => {
			state.active = 'complete';
		}, []);
	}
	function useStep(name: Steps[number], disableNextOnUnmount = false) {
		const active = useSnapshot(state).active;
		const next = useCallback(() => {
			if (state.active !== name) return;
			const index = steps.indexOf(name);
			if (index === steps.length - 1) {
				state.active = 'complete';
			} else {
				state.active = steps[index + 1];
			}
		}, [name]);
		const isLast = steps.indexOf(name) === steps.length - 1;
		const isOnly = steps.length === 1;

		useEffectOnce(() => {
			stepUnmounted[name] = false;

			if (disableNextOnUnmount) {
				return;
			}

			return () => {
				stepUnmounted[name] = true;
				setTimeout(() => {
					if (stepUnmounted[name]) {
						next();
					}
				}, 1000);
			};
		});

		return [active === name, next, isLast, isOnly] as const;
	}
	function useCancel() {
		return useCallback(() => {
			state.active = null;
		}, []);
	}

	return {
		useBegin,
		useSkip,
		useStep,
		useCancel,
		begin: () => {
			if (state.active === null) {
				state.active = steps[0];
			}
		},
		skip: () => {
			state.active = 'complete';
		},
		cancel: () => {
			state.active = null;
		},
	};
}

export type OnboardingStep<O extends Onboarding<any>> = O extends Onboarding<
	infer S
>
	? S[number]
	: never;
