import styles from './styles/window.module.scss';

interface WindowHeaderProps {
  id: string;
  title: string;
  color: string;
  icon: string;
  onClose: () => void;
  onMinimize: () => void;
  onMouseDown?: (e: MouseEvent) => void;
  isDragging?: boolean;
}

export function WindowHeader({ id, title, color, icon, onClose, onMinimize, onMouseDown, isDragging }: WindowHeaderProps) {
  return (
    <header
      class={[styles.windowHeader, isDragging && styles.dragging].filter(Boolean).join(' ')}
      onMouseDown={onMouseDown}
    >
      <div class={styles.headerLeft}>
        <span class={styles.windowIndicator} style={{ backgroundColor: color }}></span>
        <span id={`window-title-${id}`} class={styles.windowTitle}>{title}</span>
      </div>
      <div class={styles.headerRight}>
        <button class={styles.minimizeButton} onClick={(event) => { event.stopPropagation(); onMinimize(); }} aria-label="Minimize window">
          –
        </button>
        <button class={styles.closeButton} onClick={(event) => { event.stopPropagation(); onClose(); }} aria-label="Close window">
          ×
        </button>
      </div>
    </header>
  );
}

