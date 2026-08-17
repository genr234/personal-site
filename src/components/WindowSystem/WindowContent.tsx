import type { JSX } from "preact";
import { MusicWindow } from "../windows/MusicWindow.tsx";
import AboutWindow from "../windows/AboutWindow.tsx";
import BlogWindow from "../windows/BlogWindow.tsx";
import ContactWindow from "../windows/ContactWindow.tsx";
import ProjectsWindow from "../windows/ProjectsWindow.tsx";

interface Props {
	windowId: string;
}

export default function WindowContent({ windowId }: Props) {
	const contentMap: Record<string, JSX.Element> = {
		music: <MusicWindow />,
		about: <AboutWindow />,
		blog: <BlogWindow />,
		contact: <ContactWindow />,
		projects: <ProjectsWindow />,
	};
	return contentMap[windowId] || <div>No content available</div>;
}
