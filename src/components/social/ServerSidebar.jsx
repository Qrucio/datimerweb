import React from 'react';
import { motion } from 'framer-motion';
import { Home, Plus, Hash } from 'lucide-react';
import { getIconById } from '../../utils/iconOptions';

const ServerIcon = ({ server, isActive, onClick, unreadCount, isFocusing }) => {
    return (
        <div className="relative group flex items-center justify-center mb-2 w-full">
            {/* Active Indicator Pips */}
            <div className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-300 ${isActive ? 'h-8 opacity-100' : 'h-2 opacity-0 group-hover:opacity-50'}`} />

            <button
                onClick={onClick}
                className={`
                    w-10 h-10 transition-all duration-300
                    flex items-center justify-center overflow-hidden border
                    ${isActive
                        ? 'bg-white text-black rounded-[12px] border-white shadow-[0_0_15px_rgba(255,255,255,0.15)]'
                        : 'bg-transparent text-white/40 border-transparent hover:border-white/20 hover:text-white rounded-[20px] hover:rounded-[12px] hover:bg-white/5'}
                `}
            >
                {/* ICON RENDER LOGIC */}
                {(() => {
                    const iconUrl = server.icon_url;
                    if (iconUrl && iconUrl.startsWith('lucide:')) {
                        const iconId = iconUrl.split(':')[1];
                        const IconComp = getIconById(iconId);
                        if (IconComp) {
                            return <IconComp size={20} className={isActive ? "text-black" : "text-white"} />;
                        }
                    }
                    return iconUrl ? (
                        <img src={iconUrl} alt={server.name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="font-bold text-xs">
                            {server.name.substring(0, 2).toUpperCase()}
                        </span>
                    );
                })()}
            </button>

            {/* Tooltip */}
            <div className="absolute left-14 px-2 py-1 bg-black border border-white/10 rounded-md text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {server.name}
            </div>
            {/* Unread Badge */}
            {unreadCount > 0 && !isActive && !isFocusing && (
                <div className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 rounded-full border-2 border-black flex items-center justify-center pointer-events-none z-10">
                    <span className="text-[9px] font-bold text-white leading-none">{unreadCount > 99 ? '99+' : unreadCount}</span>
                </div>
            )}
        </div>
    );
}

const ServerSidebar = ({ servers = [], activeServerId, onSelectServer, onSelectHome, onCreateServer, unreadCounts = {}, isFocusing }) => {
    return (
        <div className="w-[60px] flex flex-col items-center py-4 bg-black border-r border-white/10 shrink-0 overflow-y-auto no-scrollbar overflow-x-hidden">
            {/* HOME ICON (Friends) */}
            <div className="relative group flex items-center justify-center mb-2 w-full">
                <div className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-300 ${!activeServerId ? 'h-8 opacity-100' : 'h-2 opacity-0 group-hover:opacity-50'}`} />
                <button
                    onClick={onSelectHome}
                    className={`
                        w-10 h-10 transition-all duration-300
                        flex items-center justify-center border
                        ${!activeServerId
                            ? 'bg-white text-black rounded-[12px] border-white shadow-[0_0_15px_rgba(255,255,255,0.15)]'
                            : 'bg-transparent text-white/40 border-transparent hover:border-white/20 hover:text-white rounded-[20px] hover:rounded-[12px] hover:bg-white/5'}
                    `}
                >
                    <Home size={18} className={!activeServerId ? "fill-black" : ""} />
                </button>
                <div className="absolute left-14 px-2 py-1 bg-black border border-white/10 rounded-md text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    Home
                </div>
            </div>

            <div className="w-6 h-[1px] bg-white/10 rounded-full mb-3 shrink-0" />

            {/* SERVER LIST */}
            {servers.map(server => (
                <ServerIcon
                    key={server.id}
                    server={server}
                    isActive={activeServerId === server.id}
                    onClick={() => onSelectServer(server.id)}
                    unreadCount={unreadCounts[server.id] || 0}
                    isFocusing={isFocusing}
                />
            ))}

            {/* ADD SERVER BUTTON */}
            <div className="relative group flex items-center justify-center mt-1 w-full">
                <button
                    onClick={onCreateServer}
                    className="w-10 h-10 rounded-[20px] group-hover:rounded-[12px] transition-all duration-300 bg-transparent text-white/30 hover:bg-white/5 hover:text-white flex items-center justify-center border border-white/10 hover:border-white/30"
                >
                    <Plus size={20} />
                </button>
                <div className="absolute left-14 px-2 py-1 bg-black border border-white/10 rounded-md text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    Add Server
                </div>
            </div>
        </div>
    );
};

export default ServerSidebar;
