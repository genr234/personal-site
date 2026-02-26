import { signal } from "@preact/signals";

export interface CommandItem {
	id: string;
	label: string;
	description?: string;
	icon?: string;
	keywords?: string[];
	action: () => void;
	group?: string;
}

export const commandPaletteOpen = signal(false);
export const commandItems = signal<CommandItem[]>([]);

export function registerItems(items: CommandItem[]) {
	const existing = commandItems.value;
	const newIds = new Set(items.map((i) => i.id));
	commandItems.value = existing.filter((i) => !newIds.has(i.id)).concat(items);
}

export function unregisterItems(ids: string[]) {
	const remove = new Set(ids);
	commandItems.value = commandItems.value.filter((i) => !remove.has(i.id));
}

export function openCommandPalette() {
	commandPaletteOpen.value = true;
}

export function closeCommandPalette() {
	commandPaletteOpen.value = false;
}

export function toggleCommandPalette() {
	commandPaletteOpen.value = !commandPaletteOpen.value;
}
