import {
	Disc3,
	File,
	FileText,
	Film,
	Folder,
	Mail,
	User,
	type LucideIcon,
} from "lucide-preact";

export const iconMap = {
	Disc3,
	File,
	FileText,
	Film,
	Folder,
	Mail,
	User,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof iconMap;
