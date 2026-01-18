import { useState, useEffect, useRef } from 'preact/hooks';

interface Props {
    src: string;
    initialX: number;
    initialY: number;
    initialRotate: number;
    delay: number;
    width?: number;
}

const Sticker = ({ src, initialX, initialY, initialRotate, delay, width = 120 }: Props) => {
    const [position, setPosition] = useState({ x: initialX, y: initialY });
    const [isDragging, setIsDragging] = useState(false);
    const [zIndex, setZIndex] = useState(10);

    const offset = useRef({ x: 0, y: 0 });

    const handlePointerDown = (e: PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const container = document.getElementById('portfolio-stage')!.getBoundingClientRect();

        const currentMouseX = e.clientX - container.left;
        const currentMouseY = e.clientY - container.top;

        offset.current = {
            x: currentMouseX - position.x,
            y: currentMouseY - position.y
        };

        setIsDragging(true);
        setZIndex(999);
    };

    useEffect(() => {
        if (!isDragging) return;

        const handlePointerMove = (e: PointerEvent) => {
            const container = document.getElementById('portfolio-stage')!.getBoundingClientRect();

            const newX = (e.clientX - container.left) - offset.current.x;
            const newY = (e.clientY - container.top) - offset.current.y;

            setPosition({ x: newX, y: newY });
        };

        const handlePointerUp = () => {
            setIsDragging(false);
            setTimeout(() => setZIndex(10), 500);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [isDragging]);

    return (
        <div
            className={`sticker-wrapper ${isDragging ? 'dragging' : ''}`}
            onPointerDown={handlePointerDown}
            style={{
                transform: `translate(${position.x}px, ${position.y}px) rotate(${initialRotate}deg) scale(${isDragging ? 1.1 : 1})`,
                zIndex: zIndex,
                animationDelay: `${delay}s`,
                width: `${width}px`
            }}
        >
            <img src={src} className="sticker-img" draggable={false} alt="sticker" />
        </div>
    );
};

export default Sticker;