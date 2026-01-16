import { computed, signal } from "@preact/signals";
import type { Position, WindowConfig, WindowState } from "./types";

const CASCADE_OFFSET = 40;
const CASCADE_START: Position = { x: 100, y: 80 };
const MAX_CASCADE = 8;

let nextZIndex = 1000;

export const windowsSignal = signal<WindowState[]>([]);
export const focusedWindowId = signal<string | null>(null);
export const mobileMode = signal(false);

// Allows content (e.g. music player) to hide the header.
export const hiddenWindowHeaders = signal<Set<string>>(new Set());

export function setWindowHeaderHidden(windowId: string, hidden: boolean) {
	const next = new Set(hiddenWindowHeaders.value);
	if (hidden) next.add(windowId);
	else next.delete(windowId);
	hiddenWindowHeaders.value = next;
}

export const activeWindows = computed(() =>
	windowsSignal.value.filter((window: WindowState) => !window.minimized),
);

export const minimizedWindows = computed(() =>
	windowsSignal.value.filter((window: WindowState) => window.minimized),
);

export function createWindow(config: WindowConfig): string {
	const existing = windowsSignal.value;
	const id = config.id;

	if (existing.some((window: WindowState) => window.id === id)) {
		focusWindow(id);
		return id;
	}

	const position = mobileMode.value
		? config.initialPosition
		: getNextCascadePosition(existing);

	const newWindow: WindowState = {
		...config,
		x: position.x,
		y: position.y,
		width: config.initialSize.width,
		height: config.initialSize.height,
		zIndex: ++nextZIndex,
		minimized: false,
		focused: true,
	};

	windowsSignal.value = existing
		.map((window: WindowState) => ({ ...window, focused: false }))
		.concat(newWindow);

	focusedWindowId.value = id;
	return id;
}

export function closeWindow(id: string) {
	windowsSignal.value = windowsSignal.value.filter(
		(window: WindowState) => window.id !== id,
	);
	if (focusedWindowId.value === id) {
		const remaining = activeWindows.value;
		focusedWindowId.value = remaining.length
			? remaining[remaining.length - 1].id
			: null;
	}
}

export function focusWindow(id: string) {
	windowsSignal.value = windowsSignal.value.map((window: WindowState) => {
		if (window.id === id) {
			return {
				...window,
				focused: true,
				minimized: false,
				zIndex: ++nextZIndex,
			};
		}
		return { ...window, focused: false };
	});
	focusedWindowId.value = id;
}

export function minimizeWindow(id: string) {
	windowsSignal.value = windowsSignal.value.map((window: WindowState) =>
		window.id === id ? { ...window, minimized: true, focused: false } : window,
	);

	if (focusedWindowId.value === id) {
		const remaining = activeWindows.value;
		focusedWindowId.value = remaining.length
			? remaining[remaining.length - 1].id
			: null;
	}
}

export function restoreWindow(id: string) {
	windowsSignal.value = windowsSignal.value.map((window: WindowState) =>
		window.id === id
			? { ...window, minimized: false, focused: true, zIndex: ++nextZIndex }
			: { ...window, focused: false },
	);
	focusedWindowId.value = id;
}

export function bringToFront(id: string) {
	windowsSignal.value = windowsSignal.value.map((window: WindowState) =>
		window.id === id ? { ...window, zIndex: ++nextZIndex } : window,
	);
}

export function setMobileMode(isMobile: boolean) {
	mobileMode.value = isMobile;
}

export function updateWindowPosition(id: string, x: number, y: number) {
	windowsSignal.value = windowsSignal.value.map((window: WindowState) =>
		window.id === id ? { ...window, x, y } : window,
	);
}

export function updateWindowSize(id: string, width: number, height: number) {
	windowsSignal.value = windowsSignal.value.map((window: WindowState) =>
		window.id === id ? { ...window, width, height } : window,
	);
}

function getNextCascadePosition(existing: WindowState[]): Position {
	const count = existing.length % MAX_CASCADE;
	return {
		x: CASCADE_START.x + count * CASCADE_OFFSET,
		y: CASCADE_START.y + count * CASCADE_OFFSET,
	};
}
