import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const HoloGrainBackground = ({ isActive, playButtonRef }) => {
    const [streamOrigin, setStreamOrigin] = useState({ x: '50%', y: '50%' });

    // REFACTOR: Calculate position exactly when animation triggers (isActive -> true)
    useEffect(() => {
        if (isActive && playButtonRef?.current) {
            const rect = playButtonRef.current.getBoundingClientRect();
            setStreamOrigin({
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            });
        }
    }, [isActive, playButtonRef]);

    return (
        <div className="fixed inset-0 z-0 bg-black overflow-hidden pointer-events-none">
            {/* 1. SVG GRAIN FILTER DEFINITION */}
            <svg className="hidden">
                <filter id="grain">
                    <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
                    <feColorMatrix type="saturate" values="0" />
                    <feBlend mode="overlay" in="SourceGraphic" in2="noise" />
                </filter>
                <filter id="holographic-noise">
                    <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
                    <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.4 0" />
                    <feBlend mode="screen" in="SourceGraphic" />
                </filter>
            </svg>

            {/* 2. BASE NOISE LAYER */}
            <div className="absolute inset-0 opacity-20" style={{ filter: 'url(#grain)' }} />

            {/* 3. FLOATING BLOB */}
            <motion.div
                animate={{
                    x: [0, 50, -30, 20, 0],
                    y: [0, -40, 20, -50, 0],
                    scale: [1, 1.2, 0.9, 1.1, 1],
                    opacity: [0.4, 0.6, 0.4]
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear",
                    repeatType: "mirror"
                }}
                className="absolute top-1/4 left-1/4 w-[60vw] h-[60vw] rounded-full blur-[100px]"
                style={{
                    background: 'conic-gradient(from 0deg, #4c1d95, #2563eb, #db2777, #4c1d95)',
                    mixBlendMode: 'screen',
                }}
            />

            {/* 4. RADIAL STREAM */}
            {/* 4. RADIAL STREAM (Removed) */}
        </div>
    );
};

export default HoloGrainBackground;