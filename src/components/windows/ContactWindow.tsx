import "../WindowSystem/styles/windows/contact-window.scss";
import { Mail, Github, ExternalLink } from "lucide-preact";
import Sticker from "../Sticker.tsx";

export default function ContactWindow() {
    return (
        <div id="contact-visuals" className="contact-wrapper">
            <Sticker
                src="https://media.tenor.com/W5ZK2V_qEbQAAAAj/moimoi.gif"
                initialX={20} initialY={40} initialRotate={-15} delay={0.2}
                containerId="contact-visuals"
            />
            <Sticker
                src="https://media.tenor.com/vDw6g_xPS5oAAAAi/rexx.gif"
                initialX={380} initialY={80} initialRotate={12} delay={0.3}
                containerId="contact-visuals"
            />

            <div className="center-content">
                <p className="greeting">Want to reach out?</p>
                <h1 className="headline">Let's create something<br />amazing together.</h1>
                <p className="description">i'm always open to discuss ideas, especially ones that bring joy to people!</p>

                <div className="contact-links">
                    <a href="mailto:hello@genr234.com" className="contact-btn">
                        <Mail className="icon" />
                        hello@genr234.com
                    </a>
                    <a href="https://github.com/genr234" target="_blank" rel="noopener noreferrer" className="contact-btn">
                        <Github className="icon" />
                        github.com/genr234
                        <ExternalLink size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                    </a>
                </div>
            </div>
        </div>
    );
}

