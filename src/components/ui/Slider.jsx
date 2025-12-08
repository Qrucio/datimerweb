import React from 'react';

/**
 * A modern, custom-styled slider component.
 * 
 * @param {number} value - Current value
 * @param {number} max - Max value (default 1)
 * @param {function} onChange - Callback for value change
 * @param {string} color - 'white' or 'black' (default 'white')
 * @param {string} className - Additional classes
 */
const Slider = ({ value, max = 1, onChange, color = "white", className = "" }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;

    // Determine background colors based on prop
    const bgBase = color === 'black' ? 'bg-black/10' : 'bg-white/10';

    return (
        <div className={`relative flex items-center h-5 w-full group cursor-pointer touch-none ${className}`}>
            {/* Hidden Native Input for Interaction */}
            <input
                type="range"
                min="0"
                max={max}
                step="0.01"
                value={value}
                onChange={onChange}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
            />

            {/* Visual Track */}
            <div className="absolute inset-x-0 flex items-center pointer-events-none z-10">
                <div className={`w-full rounded-full transition-all duration-300 ease-out ${bgBase} h-[2px] group-hover:h-[4px] group-active:h-[4px]`}>
                    {/* Filled Part */}
                    <div
                        className="h-full rounded-full transition-all duration-75 ease-out"
                        style={{ width: `${percentage}%`, backgroundColor: color }}
                    />
                </div>
            </div>
        </div>
    );
};

export default Slider;
