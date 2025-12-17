import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

export const usePiP = () => {
    const [pipWindow, setPipWindow] = useState(null);
    const [isActive, setIsActive] = useState(false);

    const togglePiP = useCallback(async () => {
        // If Active -> Close
        if (pipWindow) {
            pipWindow.close();
            return;
        }

        // If Inactive -> Open
        if (!window.documentPictureInPicture) {
            alert("Your browser doesn't support Document PiP (Chrome/Edge 111+ required).");
            return;
        }

        try {
            const pipWin = await window.documentPictureInPicture.requestWindow({
                width: 600,
                height: 400,
            });

            // Apply Base Styles
            pipWin.document.body.className = "bg-black text-white h-screen w-screen overflow-hidden m-0";

            // 1. Copy Styles
            [...document.styleSheets].forEach((styleSheet) => {
                try {
                    if (styleSheet.cssRules) {
                        const style = document.createElement('style');
                        const rules = [...styleSheet.cssRules]
                            .map((rule) => rule.cssText)
                            .join('');
                        style.textContent = rules;
                        pipWin.document.head.appendChild(style);
                    }
                } catch (e) {
                    if (styleSheet.href) {
                        const link = document.createElement('link');
                        link.rel = 'stylesheet';
                        link.href = styleSheet.href;
                        pipWin.document.head.appendChild(link);
                    }
                }
            });

            // 2. Listen for Close
            pipWin.addEventListener('pagehide', () => {
                setPipWindow(null);
                setIsActive(false);
            });

            setPipWindow(pipWin);
            setIsActive(true);

        } catch (err) {
            console.error("Failed to open PiP:", err);
            setIsActive(false);
        }
    }, [pipWindow]);

    // Portal Component
    const PiPPortal = useCallback(({ children }) => {
        if (!pipWindow) return <>{children}</>;
        return createPortal(children, pipWindow.document.body);
    }, [pipWindow]);

    return {
        isActive,
        togglePiP,
        PiPPortal
    };
};
