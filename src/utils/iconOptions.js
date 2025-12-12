import {
    Zap, Coffee, Flame, Heart, Star, Crown, Skull, Trophy,
    Gem, Sword, Shield, Ghost, Anchor, Music, Gamepad2, Gift,
    Tv, Laptop, Smartphone, Dumbbell, Headphones, Book,
    Camera, Watch, Sun, Moon, Briefcase, Umbrella
} from 'lucide-react';

export const ICON_OPTIONS = [
    { id: 'zap', Icon: Zap }, { id: 'coffee', Icon: Coffee },
    { id: 'flame', Icon: Flame }, { id: 'heart', Icon: Heart },
    { id: 'star', Icon: Star }, { id: 'crown', Icon: Crown },
    { id: 'skull', Icon: Skull }, { id: 'trophy', Icon: Trophy },
    { id: 'gem', Icon: Gem }, { id: 'sword', Icon: Sword },
    { id: 'shield', Icon: Shield }, { id: 'ghost', Icon: Ghost },
    { id: 'music', Icon: Music }, { id: 'gamepad', Icon: Gamepad2 },
    // Daily Objects
    { id: 'tv', Icon: Tv }, { id: 'laptop', Icon: Laptop },
    { id: 'phone', Icon: Smartphone }, { id: 'gym', Icon: Dumbbell },
    { id: 'audio', Icon: Headphones }, { id: 'book', Icon: Book },
    { id: 'cam', Icon: Camera }, { id: 'watch', Icon: Watch },
    { id: 'sun', Icon: Sun }, { id: 'moon', Icon: Moon },
    { id: 'work', Icon: Briefcase }, { id: 'rain', Icon: Umbrella }
];

export const getIconById = (id) => {
    return ICON_OPTIONS.find(opt => opt.id === id)?.Icon || null;
};
