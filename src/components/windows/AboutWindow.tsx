import "../WindowSystem/styles/windows/about-window.scss"
import { ArrowRight } from "lucide-preact";
import { createWindow } from "../../lib/windowManager.ts";
import { defaultWindowConfigs } from "../../lib/windowConfigs.ts";

function openWindow(id: string) {
    const config = defaultWindowConfigs.find((c) => c.id === id);
    if (config) createWindow(config);
}

export default function AboutWindow() {
    return (
        <div className="portfolio-wrapper">
            <div className="center-content">
                <p className="greeting">Hey! i'm genr234.</p>
                <h1 className="headline">I make computers <br /> do things</h1>
                <p className="tagline">...and I still haven't gotten over how cool that is.</p>
                <div className="cta-row">
                    <button type="button" className="work-link" onClick={() => openWindow("projects")}>
                        My projects
                        <span className="arrow"><ArrowRight size={18} /></span>
                    </button>
                    <button type="button" className="cta-btn" onClick={() => openWindow("contact")}>
                        Let's talk!
                        <span className="arrow"><ArrowRight /></span>
                    </button>
                </div>
            </div>
        </div>
    );
}
