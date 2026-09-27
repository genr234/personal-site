import type { IconName } from "./icons";

export interface Position {
	x: number;
	y: number;
}

export interface Size {
	width: number;
	height: number;
}

export interface WindowConfig {
	id: string;
	title: string;
	color: string;
	icon: IconName;
	initialPosition: Position;
	initialSize: Size;
	minSize?: Size;
	maxSize?: Size;
	resizable?: boolean;
	variant?: "default" | "seamless";
	headerBackground?: string;
	headerTextColor?: string;
    shownByDefault?: boolean;
}

export interface WindowHeaderOverride {
	hidden?: boolean;
	background?: string;
	textColor?: string;
}

export interface WindowState extends WindowConfig {
	x: number;
	y: number;
	width: number;
	height: number;
	zIndex: number;
	minimized: boolean;
	focused: boolean;
}

export interface DockItemConfig {
	id: string;
	type: "app" | "minimized-window";
	icon: IconName;
	label: string;
	color: string;
	onClick: () => void;
	isActive?: boolean;
}
