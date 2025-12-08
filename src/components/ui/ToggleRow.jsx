import React from 'react';
import Switch from './Switch';

/**
 * A full-row toggle component with Icon, Label, Description, and Switch.
 * Matches the "AestheticToggle" from UnifiedSettingsModal.
 */
const ToggleRow = ({ label, description, checked, onChange, icon: Icon, className = "" }) => {
    return (
        <div
            onClick={() => onChange(!checked)}
            className={`flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl group hover:bg-white/10 transition-all cursor-pointer select-none active:scale-[0.99] ${className}`}
        >
            <div className="flex items-center gap-4 pr-4 overflow-hidden">
                {Icon && (
                    <div className={`p-2 rounded-xl transition-colors duration-300 shrink-0 ${checked ? 'bg-white text-black' : 'bg-white/5 text-white/40'}`}>
                        <Icon size={18} strokeWidth={checked ? 2.5 : 2} />
                    </div>
                )}
                <div className="min-w-0">
                    <h4 className={`text-sm font-bold transition-colors duration-300 truncate ${checked ? 'text-white' : 'text-white/60'}`}>
                        {label}
                    </h4>
                    {description && (
                        <p className="text-white/30 text-[10px] leading-tight mt-0.5 truncate">
                            {description}
                        </p>
                    )}
                </div>
            </div>
            {/* Switch Component */}
            <Switch checked={checked} onChange={onChange} />
        </div>
    );
};

export default ToggleRow;
