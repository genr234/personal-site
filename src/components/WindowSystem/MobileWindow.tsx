import styles from './styles/mobile.module.scss';
import type { WindowState } from '../../lib/types';

interface MobileWindowProps {
  windowState: WindowState;
  onClose: () => void;
  onFocus: () => void;
}

function getWindowContent(id: string, color: string) {
  // Simplified mobile content
  const contentStyles = {
    fontFamily: 'Inter, sans-serif',
    color: '#1a1a1a',
  };

  const headingStyles = {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '12px',
    color: color,
  };

  switch (id) {
    case 'about':
      return (
        <div style={contentStyles}>
          <h2 style={headingStyles}>About Me</h2>
          <p>Welcome to my portfolio! I'm a developer passionate about creating beautiful web experiences.</p>
        </div>
      );
    case 'projects':
      return (
        <div style={contentStyles}>
          <h2 style={headingStyles}>Projects</h2>
          <p>Window Management System, Portfolio Site, and more...</p>
        </div>
      );
    case 'experience':
      return (
        <div style={contentStyles}>
          <h2 style={headingStyles}>Experience</h2>
          <p>Senior Developer (2024 - Present)</p>
        </div>
      );
    case 'contact':
      return (
        <div style={contentStyles}>
          <h2 style={headingStyles}>Get in Touch</h2>
          <p>Contact form coming soon...</p>
        </div>
      );
    default:
      return <div style={contentStyles}>No content available</div>;
  }
}

export function MobileWindow({ windowState, onClose, onFocus }: MobileWindowProps) {
  const { id, title, color } = windowState;

  return (
    <section
      class={styles.mobileWindow}
      role="dialog"
      aria-labelledby={`mobile-window-title-${id}`}
      onClick={onFocus}
    >
      <header class={styles.mobileHeader}>
        <div class={styles.titleGroup}>
          <span class={styles.indicator} style={{ backgroundColor: color }}></span>
          <h2 id={`mobile-window-title-${id}`}>{title}</h2>
        </div>
        <button onClick={onClose} aria-label="Close window">
          ×
        </button>
      </header>
      <div class={styles.mobileContent}>{getWindowContent(id, color)}</div>
    </section>
  );
}
