import type {LucideIcon} from "lucide-preact";

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
	icon: string;
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
	icon: string;
	label: string;
	color: string;
	onClick: () => void;
	isActive?: boolean;
}
