import { useEffect } from "preact/hooks";
import type { WindowHeaderOverride } from "./types";
import { setWindowHeader } from "./windowManager";

// Drive a window's header from inside its content; reverts to the config on unmount.
export function useWindowHeader(
	windowId: string,
	{ hidden, background, textColor }: WindowHeaderOverride,
) {
	useEffect(() => {
		setWindowHeader(windowId, { hidden, background, textColor });
	}, [windowId, hidden, background, textColor]);

	useEffect(() => () => setWindowHeader(windowId, null), [windowId]);
}
