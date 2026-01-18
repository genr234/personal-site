import { MusicWindow } from "../windows/MusicWindow.tsx";
import type { JSX } from "preact";
import AboutWindow from "../windows/AboutWindow.tsx";
import BlogWindow from "../windows/BlogWindow.tsx";

interface Props {
	windowId: string;
}

const contentMap: Record<string, JSX.Element> = {
	music: <MusicWindow />,
    about: <AboutWindow />,
    blog: <BlogWindow />,
};

export default function WindowContent({ windowId }: Props) {
	return contentMap[windowId] || <div>No content available</div>;
}
