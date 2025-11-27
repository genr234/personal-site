import styles from "./styles/dock.module.scss";
import type { DockItemConfig } from "../../lib/types";
import {icons} from "lucide-preact";

interface DockItemProps extends DockItemConfig {
	scale: number;
	onMouseEnter?: () => void;
	onMouseLeave?: () => void;
}



export function DockItem({
	id,
	icon,
	label,
	color,
	onClick,
	isActive,
	scale,
	onMouseEnter,
	onMouseLeave,
}: DockItemProps) {
    const DockIcon = icons[icon];

	return (
		<button
			class={[styles.dockItem, isActive && styles.active]
				.filter(Boolean)
				.join(" ")}
			onClick={onClick}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			aria-label={`Open ${label} window`}
			aria-pressed={isActive}
			style={{
				"--dock-item-scale": String(scale),
				"--dock-item-color": color,
			}}
		>
			<span class={styles.icon}><DockIcon /></span>
			<span class={styles.label}>{label}</span>
			{isActive && <span class={styles.activeIndicator}></span>}
		</button>
	);
}
