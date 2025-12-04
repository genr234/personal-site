import { createWindow, windowsSignal } from "../lib/windowManager";
import { defaultWindowConfigs } from "../lib/windowConfigs";
import { computed } from "@preact/signals";
import styles from "./styles/nav-item.module.scss";

interface NavItemProps {
	label: string;
	windowName: string;
}

export default function NavItem({ label, windowName }: NavItemProps) {
	// Computed signal to check if this window is open
	const isWindowOpen = computed(() =>
		windowsSignal.value.some((w) => w.id === windowName && !w.minimized),
	);

	const handleClick = (e: MouseEvent) => {
		e.preventDefault();
		const config = defaultWindowConfigs.find((c) => c.id === windowName);
		if (config) {
			createWindow(config);
		}
	};

	const className = `${styles.navItem} ${isWindowOpen.value ? styles.active : ""}`.trim();

	return (
		<div
			className={className}
			data-window-name={windowName}
			onClick={handleClick}
            data-cursor-target="true"
		>
			{label}
		</div>
	);
}
