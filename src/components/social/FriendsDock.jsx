import React from 'react';
import { Pin } from 'lucide-react';
import { useRemoteParticipants } from '@livekit/components-react';

const FriendsDock = ({ friends, onViewFriendStats }) => {
    // get remote participants to check who is in the call
    const remoteParticipants = useRemoteParticipants();

    // Create a set of identities (which should match user UIDs) for O(1) lookup
    const callParticipantIds = new Set(remoteParticipants.map(p => p.identity));

    const visibleFriends = friends.filter(f => !callParticipantIds.has(f.uid));

    if (!visibleFriends || visibleFriends.length === 0) return null;

    return (
        <div className="flex flex-col gap-2 mb-4 items-start pl-1">
            {visibleFriends.map(f => (
                <button
                    key={f.uid}
                    onClick={() => onViewFriendStats(f)}
                    className="group flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full animate-fade-in-up hover:bg-white/10 transition-all duration-500 ease-smooth"
                >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${f.isOnline ? (f.isActive ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-yellow-500') : 'bg-gray-500'}`} />
                    <span className="text-xs font-medium text-white flex items-center gap-1">
                        {f.displayName}
                        {f.isPinned && <Pin size={10} className="text-white/50 fill-white/50" />}
                    </span>
                    <span className="text-xs text-white/50 overflow-hidden whitespace-nowrap transition-all duration-500 ease-smooth max-w-0 opacity-0 -ml-1 group-hover:max-w-[150px] group-hover:opacity-100 group-hover:ml-0 group-hover:border-l group-hover:border-white/10 group-hover:pl-2">
                        {f.statusText}
                    </span>
                </button>
            ))}
        </div>
    );
};

export default FriendsDock;
