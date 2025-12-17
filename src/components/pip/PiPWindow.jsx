import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2 } from 'lucide-react';

const PiPWindow = ({ children, isActive, setIsActive }) => {
    const [pipWindow, setPipWindow] = useState(null);

    // 1. OPEN PiP
    const openPiP = async () => {
        if (!window.documentPictureInPicture) {
            alert("Your browser doesn't support Document PiP (Chrome/Edge 111+ required).");
            return;
        }

        try {
            // Request Window
            const pipWin = await window.documentPictureInPicture.requestWindow({
                width: 600,
                height: 400,
            });

            // Copy Styles (Critical for Tailwind/CSS)
            // We copy all style tags and link[rel="stylesheet"]
            [...document.styleSheets].forEach((styleSheet) => {
                try {
                    // Try to access rules (might fail for CORS)
                    if (styleSheet.cssRules) {
                        const style = document.createElement('style');
                        const rules = [...styleSheet.cssRules]
                            .map((rule) => rule.cssText)
                            .join('');
                        style.textContent = rules;
                        pipWin.document.head.appendChild(style);
                    }
                } catch (e) {
                    // Fallback for CORS (e.g., Google Fonts, CDN)
                    if (styleSheet.href) {
                        const link = document.createElement('link');
                        link.rel = 'stylesheet';
                        link.href = styleSheet.href;
                        pipWin.document.head.appendChild(link);
                    }
                }
            });

            // Listen for close
            pipWin.addEventListener('pagehide', () => {
                setIsActive(false);
                setPipWindow(null);
            });

            setPipWindow(pipWin);
            setIsActive(true);

        } catch (err) {
            console.error("Failed to open PiP:", err);
            setIsActive(false);
        }
    };

    // 2. CLOSE PiP (Programmatic)
    const closePiP = () => {
        if (pipWindow) {
            pipWindow.close(); // Triggers pagehide event above
            setPipWindow(null);
            setIsActive(false);
        }
    };

    // 3. EFFECT: Handle External Toggles
    useEffect(() => {
        if (isActive && !pipWindow) {
            openPiP();
        } else if (!isActive && pipWindow) {
            closePiP();
        }
    }, [isActive]);

    // 4. RENDER
    // If active and window exists -> Portal to PiP Body
    if (isActive && pipWindow) {
        return createPortal(
            <div className="h-full w-full bg-black text-white overflow-hidden">
                {children}
            </div>,
            pipWindow.document.body
        );
    }

    // Otherwise -> Render normally in-place
    return <>{children}</>;
};

export default PiPWindow;
