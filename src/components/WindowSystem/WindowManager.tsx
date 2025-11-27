import { useEffect } from "preact/hooks";
import { useComputed } from "@preact/signals";
import { Window } from "./Window";
import { Dock } from "./Dock";
import styles from "./styles/window.module.scss";
import { defaultWindowConfigs } from "../../lib/windowConfigs";
import {
	windowsSignal,
	createWindow,
	focusWindow,
	minimizeWindow,
	restoreWindow,
	setMobileMode,
} from "../../lib/windowManager";

export function WindowManager() {
	const activeWindows = useComputed(() =>
		windowsSignal.value.filter((w) => !w.minimized),
	);

	const minimizedWindows = useComputed(() =>
		windowsSignal.value.filter((w) => w.minimized),
	);

	useEffect(() => {
		const checkMobile = () => {
			const isMobile = window.innerWidth <= 767;
			setMobileMode(isMobile);
			document.body.classList.toggle("mobile-window-mode", isMobile);
		};

		checkMobile();
		window.addEventListener("resize", checkMobile);

		return () => {
			window.removeEventListener("resize", checkMobile);
		};
	}, []);

	return (
		<div class={styles.windowLayer}>
			<div class={styles.windowsContainer}>
				{activeWindows.value.map((window) => (
					<Window key={window.id} windowState={window} />
				))}
			</div>
			<Dock
				appItems={defaultWindowConfigs}
				minimizedWindows={minimizedWindows.value}
				onItemClick={(id) => {
					const minimized = minimizedWindows.value.find(
						(window) => window.id === id,
					);
					if (minimized) {
						restoreWindow(id);
					} else {
						createWindow(
							defaultWindowConfigs.find((config) => config.id === id)!,
						);
					}
				}}
				onMinimize={(id) => minimizeWindow(id)}
				onFocus={(id) => focusWindow(id)}
			/>
		</div>
	);
}
