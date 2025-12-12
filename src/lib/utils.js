import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export const isMac = () => {
    if (typeof window === 'undefined') return false;
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
};
