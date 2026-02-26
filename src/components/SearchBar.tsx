import { Search } from "lucide-preact";
import { toggleCommandPalette } from "../lib/commandPalette";
import styles from "./styles/search-bar.module.scss";

export function SearchBar() {
	return (
		<button
			class={styles.searchBar}
			onClick={() => toggleCommandPalette()}
			title="Open search (⌘K)"
		>
			<Search size={18} />
		</button>
	);
}
