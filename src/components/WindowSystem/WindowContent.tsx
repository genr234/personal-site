import {MusicWindow} from "../windows/MusicWindow.tsx";
import type { JSX } from "preact";

interface Props {
  windowId: string;
}

const contentMap: Record<string, JSX.Element> = {
    music: <MusicWindow />
}

export default function WindowContent({ windowId }: Props) {
    return contentMap[windowId] || <div>No content available</div>;
}