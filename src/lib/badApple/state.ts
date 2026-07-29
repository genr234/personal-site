import { signal } from "@preact/signals";

export const badApplePlaying = signal(false);
export const badAppleError = signal<string | null>(null);

export function requestBadAppleToggle() {
	window.dispatchEvent(new CustomEvent("bad-apple:toggle"));
}
