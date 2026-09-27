import styles from "./styles/window.module.scss";

interface WindowHeaderProps {
	onClose: () => void;
	onMinimize: () => void;
	onBack?: () => void;
	onMouseDown?: (e: MouseEvent) => void;
	isDragging?: boolean;
	variant?: "default" | "seamless";
	headerBackground?: string;
	headerTextColor?: string;
}

export function WindowHeader({
									 onClose,
									 onMinimize,
									 onBack,
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
				{onBack && (
					<button type="button" class={styles.minimizeButton} onClick={onBack} aria-label="Back">
						←
					</button>
				)}
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
