import { useState } from "preact/hooks";
import { DockItem } from "./DockItem";
import styles from "./styles/dock.module.scss";
import type { WindowConfig, WindowState, DockItemConfig } from "../../lib/types";

interface DockEntry extends DockItemConfig {
	shownByDefault?: boolean;
}

interface DockProps {
	appItems: WindowConfig[];
	minimizedWindows: WindowState[];
	onItemClick: (id: string) => void;
	onFocus: (id: string) => void;
	onMinimize: (id: string) => void;
}

export function Dock({ appItems, minimizedWindows, onItemClick }: DockProps) {
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

	const getScale = (index: number) => {
		if (hoveredIndex === null) return 1;
		const distance = Math.abs(index - hoveredIndex);
		if (distance === 0) return 1.15;
		if (distance === 1) return 1.08;
		if (distance === 2) return 1.04;
		return 1;
	};

	const items: DockEntry[] = [
		...appItems.map((app) => ({
			id: app.id,
			type: "app" as const,
			icon: app.icon,
			label: app.title,
			color: app.color,
			onClick: () => onItemClick(app.id),
			isActive: false,
			shownByDefault: app.shownByDefault ?? true,
		})),
		...minimizedWindows.map((window) => ({
			id: window.id,
			type: "minimized-window" as const,
			icon: "File",
			label: window.title,
			color: window.color,
			onClick: () => onItemClick(window.id),
			isActive: true,
		})),
	];

	return (
		<nav class={styles.dock} aria-label="Application dock">
			<div class={styles.dockInner}>
				{items.map((item, index) => {
					if (item.shownByDefault === false) return null;
					return (
						<DockItem
							key={item.id}
							{...item}
							scale={getScale(index)}
							onMouseEnter={() => setHoveredIndex(index)}
							onMouseLeave={() => setHoveredIndex(null)}
						/>
					);
				})}
			</div>
		</nav>
	);
}
