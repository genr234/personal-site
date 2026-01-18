import "../WindowSystem/styles/windows/about-window.scss"
import {ArrowRight, MoveUpRight} from "lucide-preact";
import {createWindow} from "../../lib/windowManager.ts";
import {defaultWindowConfigs} from "../../lib/windowConfigs.ts";
import Sticker from "../Sticker.tsx";


interface Props {

}

export default function AboutWindow({}: Props) {
    return (
        <div id="portfolio-stage" className="portfolio-wrapper">
            <Sticker
                src="https://emoji.slack-edge.com/T09V59WQY1E/yay-mimi/ab78889bb057e592.gif"
                initialX={60} initialY={50} initialRotate={-12} delay={0.2}
            />
            <Sticker
                src="https://media.tenor.com/fDGpLelXeCAAAAAi/capoo-jump.gif"
                initialX={500} initialY={40} initialRotate={15} delay={0.3}
            />
            <Sticker
                src="https://emoji.slack-edge.com/T09V59WQY1E/tetohaha/d47c280db29547c2.png"
                initialX={80} initialY={280} initialRotate={8} delay={0.4}
            />
            <Sticker
                src="https://emoji.slack-edge.com/T09V59WQY1E/nodnod/b1b1076c09d0515a.gif"
                initialX={510} initialY={300} initialRotate={-10} delay={0.5}
            />

            <div className="center-content">
                <p className="greeting">Hey! i'm genr234!</p>
                <h1 className="headline">I make computers <br /> do things</h1>
                <p className="tagline">...and I still haven't gotten over how cool that is.</p>
                <button className="cta-btn" onClick={() => createWindow(defaultWindowConfigs.find(c => c.id === "contact")!)}>
                    Let's talk!
                    <span className="arrow"><ArrowRight /></span>
                </button>
            </div>
        </div>    );
}