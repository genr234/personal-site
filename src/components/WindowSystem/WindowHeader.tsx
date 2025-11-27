import styles from "./styles/window.module.scss";

interface WindowHeaderProps {
	id: string;
	title: string;
	color: string;
	icon: string;
	onClose: () => void;
	onMinimize: () => void;
	onMouseDown?: (e: MouseEvent) => void;
	isDragging?: boolean;
	variant?: "default" | "seamless";
	headerBackground?: string;
	headerTextColor?: string;
}

export function WindowHeader({
	id,
	title,
	color,
	icon,
	onClose,
	onMinimize,
	onMouseDown,
	isDragging,
	variant = "default",
	headerBackground,
	headerTextColor,
}: WindowHeaderProps) {
	const headerStyle =
		variant === "seamless"
			? ({
					"--header-bg": headerBackground || "transparent",
					"--header-text": headerTextColor || "#fff",
				} as any)
			: {};

	return (
		<header
			class={[
				styles.windowHeader,
				isDragging && styles.dragging,
				variant === "seamless" && styles.headerSeamless,
			]
				.filter(Boolean)
				.join(" ")}
			style={headerStyle}
			onMouseDown={onMouseDown}
		>
			<div class={styles.headerLeft}>
				<span
					class={styles.windowIndicator}
					style={{ backgroundColor: color }}
				/>
				<span id={`window-title-${id}`} class={styles.windowTitle}>
					{title}
				</span>
			</div>
			<div class={styles.headerRight}>
				<button
					type="button"
					class={styles.minimizeButton}
					onClick={(event) => {
						event.stopPropagation();
						onMinimize();
					}}
					aria-label="Minimize window"
				>
					–
				</button>
				<button
					type="button"
					class={styles.closeButton}
					onClick={(event) => {
						event.stopPropagation();
						onClose();
					}}
					aria-label="Close window"
				>
					×
				</button>
			</div>
		</header>
	);
}
