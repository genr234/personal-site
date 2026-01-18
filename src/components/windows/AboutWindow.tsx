import "../WindowSystem/styles/windows/about-window.scss"
import {ArrowRight, MoveUpRight} from "lucide-preact";
import {createWindow} from "../../lib/windowManager.ts";
import {defaultWindowConfigs} from "../../lib/windowConfigs.ts";


interface Props {

}

export default function AboutWindow({}: Props) {
    return (
        <div className="portfolio-wrapper">
            <div className="photo-card top-left">
                <img src="https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=400&q=80" alt="Decoration" />
            </div>
            <div className="photo-card top-right">
                <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80" alt="Decoration" />
            </div>
            <div className="photo-card bottom-left">
                <img src="https://images.unsplash.com/photo-1582201942988-13e60e4556ee?auto=format&fit=crop&w=400&q=80" alt="Decoration" />
            </div>
            <div className="photo-card bottom-right">
                <img src="https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&w=400&q=80" alt="Decoration" />
            </div>

            <div className="center-content">
                <p className="greeting">Hey! i'm genr234.</p>

                <h1 className="headline">
                    I make computers do <br /> things
                </h1>

                <p className="tagline">... and i still haven't gotten how cool that is</p>

                <button className="cta-btn" onClick={() => createWindow(defaultWindowConfigs.find(c => c.id === "contact")!)}>
                    Let's talk!
                    <span className="arrow"><ArrowRight /></span>
                </button>
            </div>

        </div>
    );
}