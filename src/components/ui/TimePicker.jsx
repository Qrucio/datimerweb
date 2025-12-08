import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

const formatTimeDisplay = (timeStr) => {
    if (!timeStr) return "--:--";
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
};

export const TimeInput = ({ value, onChange, className = "" }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative w-full">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-left flex items-center justify-between hover:bg-white/10 transition-colors ${className}`}
            >
                <span className={`text-sm font-bold ${value ? 'text-white' : 'text-white/30'}`}>
                    {value ? formatTimeDisplay(value) : "Select Time"}
                </span>
                <ChevronDown size={16} className={`text-white/30 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/20 rounded-xl shadow-2xl z-[70] p-4">
                        <TimePicker value={value} onChange={onChange} />
                    </div>
                </>
            )}
        </div>
    );
};

export const TimePicker = ({ value, onChange }) => {
    // Default to 12:00 if empty
    const [hStr, mStr] = value ? value.split(':') : ['12', '00'];
    const hour = parseInt(hStr, 10);
    const minute = parseInt(mStr, 10);

    const update = (newH, newM) => {
        onChange(`${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`);
    };

    const handleInputChange = (e, type) => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val)) return; // Allow empty? No, let's keep it simple for now, maybe just ignore non-numbers

        if (type === 'hour') {
            val = Math.max(0, Math.min(23, val));
            update(val, minute);
        } else {
            val = Math.max(0, Math.min(59, val));
            update(hour, val);
        }
    };

    return (
        <div className="flex items-center justify-center gap-4 select-none">
            {/* Hours */}
            <div className="flex flex-col items-center">
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); update((hour + 1) % 24, minute); }}
                    className="p-1 hover:text-white text-white/40 transition-colors"
                >
                    <ChevronUp size={20} />
                </button>
                <input
                    type="text"
                    inputMode="numeric"
                    value={hour.toString().padStart(2, '0')}
                    onChange={(e) => handleInputChange(e, 'hour')}
                    onClick={(e) => e.stopPropagation()}
                    className="text-2xl font-bold text-white w-14 text-center tabular-nums my-1 bg-black/40 rounded-lg py-1 border border-white/5 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors"
                />
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); update((hour - 1 + 24) % 24, minute); }}
                    className="p-1 hover:text-white text-white/40 transition-colors"
                >
                    <ChevronDown size={20} />
                </button>
            </div>

            <div className="text-xl font-bold text-white/30 pb-2">:</div>

            {/* Minutes */}
            <div className="flex flex-col items-center">
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); update(hour, (minute + 5) % 60); }}
                    className="p-1 hover:text-white text-white/40 transition-colors"
                >
                    <ChevronUp size={20} />
                </button>
                <input
                    type="text"
                    inputMode="numeric"
                    value={minute.toString().padStart(2, '0')}
                    onChange={(e) => handleInputChange(e, 'minute')}
                    onClick={(e) => e.stopPropagation()}
                    className="text-2xl font-bold text-white w-14 text-center tabular-nums my-1 bg-black/40 rounded-lg py-1 border border-white/5 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors"
                />
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); update(hour, (minute - 5 + 60) % 60); }}
                    className="p-1 hover:text-white text-white/40 transition-colors"
                >
                    <ChevronDown size={20} />
                </button>
            </div>
        </div>
    );
};