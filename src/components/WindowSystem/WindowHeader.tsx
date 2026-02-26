import { useComputed } from "@preact/signals";
import { hiddenWindowHeaders } from "../../lib/windowManager";
import { ArrowLeft } from "lucide-preact";
import styles from "./styles/window.module.scss";

interface WindowHeaderProps {
	id: string;
	color: string;
	icon: string;
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
	id,
	color,
	icon,
	onClose,
	onMinimize,
	onMouseDown,
	onBack,
	isDragging,
	variant = "default",
}: WindowHeaderProps) {
	const isHidden = useComputed(() => hiddenWindowHeaders.value.has(id));
	if (isHidden.value) return null;

	return (
		<header
			class={[
				styles.windowHeader,
				isDragging && styles.dragging,
				variant === "seamless" && styles.headerSeamless,
			]
				.filter(Boolean)
				.join(" ")}
			onMouseDown={onMouseDown}
		>
			<div class={styles.headerLeft}>
				{onBack && (
					<button
						type="button"
						class={styles.backButton}
						onClick={(e) => {
							e.stopPropagation();
							onBack();
						}}
						aria-label="Back"
					>
						<ArrowLeft size={16} />
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
