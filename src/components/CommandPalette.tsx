import { useEffect, useRef, useState } from "preact/hooks";
import { icons, Search } from "lucide-preact";
import {
	commandPaletteOpen,
	commandItems,
	toggleCommandPalette,
	closeCommandPalette,
	registerItems,
	unregisterItems,
	type CommandItem,
} from "../lib/commandPalette";
import { createWindow } from "../lib/windowManager";
import { defaultWindowConfigs } from "../lib/windowConfigs";
import styles from "./styles/command-palette.module.scss";

function matchesQuery(item: CommandItem, query: string): boolean {
	const q = query.toLowerCase();
	if (item.label.toLowerCase().includes(q)) return true;
	if (item.description?.toLowerCase().includes(q)) return true;
	if (item.keywords?.some((k) => k.toLowerCase().includes(q))) return true;
	return false;
}

interface GroupedItems {
	group: string;
	items: CommandItem[];
}

function groupItems(items: CommandItem[]): GroupedItems[] {
	const groups: Map<string, CommandItem[]> = new Map();
	for (const item of items) {
		const key = item.group ?? "";
		const list = groups.get(key);
		if (list) list.push(item);
		else groups.set(key, [item]);
	}
	return Array.from(groups, ([group, items]) => ({ group, items }));
}

export function CommandPalette() {
	const [query, setQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const resultsRef = useRef<HTMLDivElement>(null);

	const isOpen = commandPaletteOpen.value;
	const allItems = commandItems.value;

	useEffect(() => {
		const windowItems: CommandItem[] = defaultWindowConfigs.map((config) => ({
			id: `window-${config.id}`,
			label: config.title,
			icon: config.icon,
			group: "Windows",
			keywords: [config.id, config.title.toLowerCase()],
			action: () => createWindow(config),
		}));
		registerItems(windowItems);
		return () => unregisterItems(windowItems.map((i) => i.id));
	}, []);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				toggleCommandPalette();
			}
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, []);

	useEffect(() => {
		if (isOpen) {
			setQuery("");
			setSelectedIndex(0);
			requestAnimationFrame(() => inputRef.current?.focus());
		}
	}, [isOpen]);

	if (!isOpen) return null;

	const filtered = query
		? allItems.filter((item) => matchesQuery(item, query))
		: allItems;

	const grouped = groupItems(filtered);

	const flatItems = grouped.flatMap((g) => g.items);

	const safeIndex = Math.min(selectedIndex, Math.max(0, flatItems.length - 1));

	const runAction = (item: CommandItem) => {
		closeCommandPalette();
		item.action();
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setSelectedIndex((i) => Math.min(i + 1, flatItems.length - 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setSelectedIndex((i) => Math.max(i - 1, 0));
		} else if (e.key === "Enter") {
			e.preventDefault();
			if (flatItems[safeIndex]) runAction(flatItems[safeIndex]);
		} else if (e.key === "Escape") {
			e.preventDefault();
			closeCommandPalette();
		}
	};

	const handleOverlayClick = (e: MouseEvent) => {
		if ((e.target as HTMLElement).classList.contains(styles.overlay)) {
			closeCommandPalette();
		}
	};

	let flatIndex = 0;

	return (
		<div class={styles.overlay} onClick={handleOverlayClick} onKeyDown={handleKeyDown}>
			<div class={styles.modal}>
				<div class={styles.searchWrapper}>
					<span class={styles.searchIcon}>
						<Search size={18} />
					</span>
					<input
						ref={inputRef}
						class={styles.searchInput}
						type="text"
						placeholder="Search..."
						value={query}
						onInput={(e) => {
							setQuery((e.target as HTMLInputElement).value);
							setSelectedIndex(0);
						}}
					/>
				</div>
				<div class={styles.separator} />
				<div class={styles.results} ref={resultsRef}>
					{flatItems.length === 0 && (
						<div class={styles.empty}>No results found</div>
					)}
					{grouped.map((group) => (
						<div key={group.group}>
							{group.group && (
								<div class={styles.groupHeader}>{group.group}</div>
							)}
							{group.items.map((item) => {
								const idx = flatIndex++;
								const isActive = idx === safeIndex;
								const IconComponent =
									item.icon && item.icon in icons
										? icons[item.icon as keyof typeof icons]
										: null;
								return (
									<div
										key={item.id}
										class={`${styles.resultItem} ${isActive ? styles.resultItemActive : ""}`}
										onClick={() => runAction(item)}
										onMouseEnter={() => setSelectedIndex(idx)}
										ref={(el) => {
											if (isActive && el) {
												el.scrollIntoView({ block: "nearest" });
											}
										}}
									>
										<span class={styles.resultIcon}>
											{IconComponent && <IconComponent size={18} />}
										</span>
										<span class={styles.resultLabel}>{item.label}</span>
										{item.description && (
											<span class={styles.resultDescription}>
												{item.description}
											</span>
										)}
									</div>
								);
							})}
						</div>
					))}
				</div>
				<div class={styles.footer}>
					<span>
						<kbd class={styles.shortcutKey}>↑</kbd>
						<kbd class={styles.shortcutKey}>↓</kbd> navigate
					</span>
					<span>
						<kbd class={styles.shortcutKey}>↵</kbd> select
					</span>
					<span>
						<kbd class={styles.shortcutKey}>esc</kbd> close
					</span>
				</div>
			</div>
		</div>
	);
}
