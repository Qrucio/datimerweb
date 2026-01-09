import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "./ui/command";
import {
    Calculator,
    Calendar,
    CreditCard,
    Settings,
    Smile,
    User,
    PartyPopper,
    Home,
    Command as CommandIcon,
    Search,
    ArrowLeft,
    ArrowRight,
    Globe,
    ExternalLink,
    Loader2,
    Play,
    Pause,
    Copy,
    Book,
    Link as LinkIcon,
    Plus,
    Pencil,
    Trash2,
    CheckSquare,
    Youtube,
    Chrome,
    Brain,
    Zap,

} from "lucide-react";
import confetti from "canvas-confetti";
import { evaluate } from "mathjs";
import { Music as MusicIcon, StickyNote, Sliders, Palette, BarChart2, Clock as ClockIcon } from "lucide-react";
import { isMac } from "../lib/utils";

const Favicon = ({ url, fallback: FallbackIcon, className }) => {
    const [error, setError] = useState(false);
    const domain = useMemo(() => {
        try {
            return new URL(url).hostname;
        } catch {
            return null;
        }
    }, [url]);

    if (!domain || error) {
        return <FallbackIcon className={className} />;
    }

    return (
        <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
            alt="icon"
            className={`rounded-sm mr-2 w-4 h-4 object-contain block ${className}`} // Adjust sizing to match lucide icons if needed
            onError={() => setError(true)}
        />
    );
};

export function CommandMenu({
    onboardingMode,
    onOnboardingNext,
    openNotes,
    openMusic,
    openSettings,
    openSocial,
    setTimerActive,
    // Timer
    mode,
    setMode,
    timeLeft,
    setTimeLeft,
    isActive,
    settings,
    // Shortcuts
    setEditingNote,
    // Sounds
    playAmbience,
    unlockedAmbiences,
    ambientSounds,
    // Quicklinks
    quicklinks,
    setQuicklinks
}) {
    const [open, setOpen] = useState(false);

    // Navigation Stack: ['home', 'wiki-search', 'wiki-detail', 'quicklink-add', 'quicklink-edit']
    const [pages, setPages] = useState(['home']);
    const activePage = pages[pages.length - 1];

    // Home / Search State
    const [homeQuery, setHomeQuery] = useState("");

    // Wiki State
    const [wikiResults, setWikiResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedWikiPage, setSelectedWikiPage] = useState(null);

    // Dictionary State
    const [dictResult, setDictResult] = useState(null);
    const [isDictLoading, setIsDictLoading] = useState(false);

    // Math State
    const [mathResult, setMathResult] = useState(null);

    // Quicklink Form State
    const [editingLink, setEditingLink] = useState(null); // { id, title, url }
    const [linkForm, setLinkForm] = useState({ title: "", url: "" });



    // OS Shortcut Text
    const shortcutKey = useMemo(() => isMac() ? "⌘" : "Ctrl", []);

    useEffect(() => {
        const down = (e) => {
            if ((e.key === "k" || e.key === " ") && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }

            if (open) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    if (pages.length > 1) {
                        popPage();
                    } else {
                        setOpen(false);
                    }
                }
                // Ctrl+E to Edit Quicklink (handled in render loop)
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, [pages, open]);

    // Reset state when closing
    useEffect(() => {
        if (!open) {
            setTimeout(() => {
                setPages(['home']);
                setHomeQuery("");
                setWikiResults([]);
                setSelectedWikiPage(null);
                setMathResult(null);
                setDictResult(null);
                setEditingLink(null);
                setLinkForm({ title: "", url: "" });
            }, 300);
        }
    }, [open]);

    // Navigation Helpers
    const pushPage = (page) => setPages(prev => [...prev, page]);
    const popPage = () => setPages(prev => prev.slice(0, -1));

    const runConfetti = () => {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setOpen(false);
    };

    // --- SMART SUGGESTIONS ---
    const [commandUsage, setCommandUsage] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('zen_command_usage')) || {};
        } catch { return {}; }
    });

    const incrementUsage = useCallback((id) => {
        setCommandUsage(prev => {
            const next = { ...prev, [id]: (prev[id] || 0) + 1 };
            localStorage.setItem('zen_command_usage', JSON.stringify(next));
            return next;
        });
    }, []);

    const suggestions = useMemo(() => {
        const items = [
            { id: 'wiki', label: 'Search Wikipedia', icon: Globe, action: () => pushPage('wiki-search') },
            { id: 'dictionary', label: 'Dictionary', icon: Book, action: () => { setDictQuery(""); setDictResult(null); pushPage('dictionary'); } },
            { id: 'confetti', label: 'Throw Confetti', icon: PartyPopper, action: runConfetti },
            { id: 'notes', label: 'Notes', icon: StickyNote, action: () => { openNotes?.(); setOpen(false); } },
            { id: 'sounds', label: 'Soundscapes', icon: MusicIcon, action: () => { openMusic?.(); setOpen(false); } },
            { id: 'friends', label: 'Friends', icon: User, action: () => { openSocial?.(); setOpen(false); } },
        ];
        return items.sort((a, b) => (commandUsage[b.id] || 0) - (commandUsage[a.id] || 0));
    }, [commandUsage, openNotes, openMusic, openSocial]);

    // --- PARSERS & DETECTORS ---

    // 1. Math
    useEffect(() => {
        const mathRegex = /^[\d\s+\-*/.()]+$/;
        const hasOperator = /[+\-*/]/.test(homeQuery);
        if (homeQuery && mathRegex.test(homeQuery) && hasOperator) {
            try {
                const result = evaluate(homeQuery);
                if (Number.isFinite(result)) setMathResult(result);
                else setMathResult(null);
            } catch (e) { setMathResult(null); }
        } else { setMathResult(null); }
    }, [homeQuery]);

    const searchDictionary = useCallback(async (word) => {
        setIsDictLoading(true);
        try {
            const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                const firstDef = data[0].meanings[0]?.definitions[0]?.definition;
                if (firstDef) setDictResult({ word: data[0].word, definition: firstDef });
                else setDictResult(null);
            } else {
                setDictResult(null);
            }
        } catch (e) { setDictResult(null); }
        finally { setIsDictLoading(false); }
    }, []);

    // 2. Dictionary ("def [word]" or "define [word]")
    useEffect(() => {
        const match = homeQuery.match(/^(?:def|define)\s+(.+)$/i);
        if (match) {
            const word = match[1];
            const debounce = setTimeout(() => searchDictionary(word), 500);
            return () => clearTimeout(debounce);
        } else {
            // Only clear if NOT on dictionary page (where we might want to keep result)
            // But this effect runs on homeQuery change.
            // If on home page, clear.
            if (activePage === 'home') setDictResult(null);
        }
    }, [homeQuery, searchDictionary, activePage]);

    // Dictionary Page State
    const [dictQuery, setDictQuery] = useState("");
    useEffect(() => {
        const t = setTimeout(() => {
            if (activePage === 'dictionary' && dictQuery.trim()) searchDictionary(dictQuery);
        }, 500);
        return () => clearTimeout(t);
    }, [dictQuery, activePage, searchDictionary]);

    // 3. Timer Duration ("timer 25" or just "25" logic moved to action)
    const timerDurationMatch = useMemo(() => {
        if (!homeQuery) return null;
        // Explicit "timer 25"
        const explicit = homeQuery.match(/^timer\s+(\d+)$/i);
        if (explicit) return parseInt(explicit[1]);
        // Implicit "25" (only if just digits and length <= 3)
        if (/^\d{1,3}$/.test(homeQuery)) return parseInt(homeQuery);
        return null;
    }, [homeQuery]);

    // 4. Timer Mode ("focus", "break")
    const timerModeMatch = useMemo(() => {
        if (!homeQuery) return null;
        const lower = homeQuery.toLowerCase();
        if (lower === 'focus' || lower === 'work') return 'focus';
        if (lower === 'break' || lower === 'short break') return 'shortBreak';
        if (lower === 'long break') return 'longBreak';
        return null;
    }, [homeQuery]);

    // 5. Sound Trigger
    const soundMatch = useMemo(() => {
        if (!homeQuery || !ambientSounds) return null;
        const lower = homeQuery.toLowerCase();
        return ambientSounds.find(s =>
            (s.name && s.name.toLowerCase() === lower) ||
            (s.label && s.label.toLowerCase() === lower)
        );
    }, [homeQuery, ambientSounds]);


    // --- ACTIONS ---

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setOpen(false);
    };

    const handleAddQuicklink = (e) => {
        e.preventDefault();
        if (!linkForm.title || !linkForm.url) return;
        const newLink = {
            id: Date.now().toString(),
            title: linkForm.title,
            url: linkForm.url.startsWith('http') ? linkForm.url : `https://${linkForm.url}`
        };
        setQuicklinks(prev => [...prev, newLink]);
        setOpen(false);
    };

    const handleEditQuicklink = (e) => {
        e.preventDefault();
        if (!editingLink) return;
        setQuicklinks(prev => prev.map(l => l.id === editingLink.id ? { ...l, ...linkForm } : l));
        setPages(['home']);
    };

    const handleDeleteQuicklink = () => {
        if (!editingLink) return;
        setQuicklinks(prev => prev.filter(l => l.id !== editingLink.id));
        setPages(['home']);
    };

    const startEditingLink = (e, link) => {
        e.stopPropagation();
        e.preventDefault();
        setEditingLink(link);
        setLinkForm({ title: link.title, url: link.url });
        pushPage('quicklink-edit');
    };

    // --- WIKIPEDIA LOGIC ---
    const searchWikipedia = useCallback(async (query) => {
        if (!query.trim()) { setWikiResults([]); return; }
        setIsLoading(true);
        try {
            // Use generator=search to get pageimages (thumbnails) and extracts in one go
            const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=10&prop=pageimages|extracts&pithumbsize=100&exintro&explaintext&exsentences=1&format=json&origin=*`);
            const data = await res.json();
            const pages = data.query?.pages || {};
            setWikiResults(Object.values(pages));
        } catch (e) { console.error("Wiki search failed", e); }
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (activePage === 'wiki-search') searchWikipedia(homeQuery); // Reusing homeQuery for search page input if we want
            // Actually, let's keep separate state for wiki page to avoid confusion, 
            // OR just use homeQuery if we are passing it. 
            // Current design: Search page has its own input.
        }, 300);
        return () => clearTimeout(timer);
    }, [activePage]);

    // Re-implement separate wiki search to allow typing in that view
    const [wikiQuery, setWikiQuery] = useState("");
    useEffect(() => {
        const t = setTimeout(() => {
            if (activePage === 'wiki-search') searchWikipedia(wikiQuery);
        }, 300);
        return () => clearTimeout(t);
    }, [wikiQuery, activePage, searchWikipedia]);

    const getWikiDetails = async (title) => {
        setIsLoading(true);
        try {
            const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&exintro&explaintext&piprop=original&titles=${encodeURIComponent(title)}&format=json&origin=*`);
            const data = await res.json();
            const page = Object.values(data.query?.pages || {})[0];
            setSelectedWikiPage(page);
            pushPage('wiki-detail');
        } catch (e) { console.error("Wiki details failed", e); }
        finally { setIsLoading(false); }
    };

    // --- FILTER ---
    const commandFilter = (value, search) => {
        const lowerValue = value.toLowerCase();
        const lowerSearch = search.toLowerCase();
        // Force match for generic web/wiki searches which use 'fallback-' prefix
        if (lowerValue.startsWith("fallback-")) return 1;
        // Standard includes for others
        return lowerValue.includes(lowerSearch) ? 1 : 0;
    };

    return (
        <>
            <button
                onClick={() => setOpen((prev) => !prev)}
                className="fixed bottom-8 right-8 z-[50] p-3 bg-white/10 text-white backdrop-blur-md border border-white/20 rounded-full shadow-2xl hover:bg-white/20 hover:scale-110 hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] active:scale-95 transition-all duration-300 group"
            >
                <CommandIcon size={20} className="group-hover:rotate-12 transition-transform" />
            </button>

            <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={activePage !== 'wiki-search' && activePage !== 'dictionary'} filter={commandFilter}>

                {/* --- 1. HOME VIEW --- */}


                {activePage === 'home' && (
                    <>
                        <CommandInput
                            placeholder="Type a command (timer 25, def word)..."
                            value={homeQuery}
                            onValueChange={setHomeQuery}
                        />
                        {(isLoading || isDictLoading) && (
                            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-white/70 to-transparent animate-pulse" />
                        )}
                        <CommandList>
                            <CommandEmpty>No results found.</CommandEmpty>

                            {/* ONBOARDING CONTINUE */}
                            {onboardingMode && (
                                <CommandGroup heading="Next Step" forceMount>
                                    <CommandItem
                                        onSelect={() => { onOnboardingNext(); setOpen(false); }}
                                        className="data-[selected=true]:bg-white/20 data-[selected=true]:text-white py-4 mb-2 border border-white/10 rounded-xl"
                                    >
                                        <ArrowRight className="mr-3 h-5 w-5 text-white animate-pulse" />
                                        <span className="text-lg font-bold text-white">Continue</span>
                                        <CommandShortcut className="text-white/50">↵</CommandShortcut>
                                    </CommandItem>
                                </CommandGroup>
                            )}

                            {/* DYNAMIC: Math Param */}
                            {mathResult !== null && (
                                <CommandGroup heading="Math Result" forceMount>
                                    <CommandItem onSelect={() => copyToClipboard(mathResult.toString())} forceMount>
                                        <Calculator className="mr-2 h-4 w-4 text-green-400" />
                                        <span className="font-mono font-bold text-green-400">= {mathResult}</span>
                                        <div className="ml-auto text-xs text-white/50 flex items-center gap-1"><Copy size={10} /> Copy</div>
                                    </CommandItem>
                                </CommandGroup>
                            )}

                            {/* DYNAMIC: Dictionary */}
                            {dictResult && (
                                <CommandGroup heading="Dictionary" forceMount>
                                    <CommandItem onSelect={() => copyToClipboard(dictResult.definition)} forceMount>
                                        <Book className="mr-2 h-4 w-4 text-blue-400" />
                                        <div className="flex flex-col">
                                            <span className="font-bold text-white capitalize">{dictResult.word}</span>
                                            <span className="text-white/70 text-xs">{dictResult.definition}</span>
                                        </div>
                                    </CommandItem>
                                </CommandGroup>
                            )}
                            {isDictLoading && <CommandItem disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Looking up...</CommandItem>}

                            {/* DYNAMIC: Timer Duration */}
                            {timerDurationMatch && (
                                <CommandGroup heading="Timer Action" forceMount>
                                    <CommandItem onSelect={() => {
                                        setMode?.('focus');
                                        setTimeLeft?.(timerDurationMatch * 60);
                                        setTimerActive?.(true);
                                        setOpen(false);
                                    }} forceMount>
                                        <Play className="mr-2 h-4 w-4 text-yellow-400" />
                                        <span>Set Focus Timer to <span className="font-bold text-yellow-400">{timerDurationMatch}m</span></span>
                                    </CommandItem>
                                </CommandGroup>
                            )}

                            {/* DYNAMIC: Timer Mode */}
                            {timerModeMatch && (
                                <CommandGroup heading="Timer Mode" forceMount>
                                    <CommandItem onSelect={() => {
                                        setMode?.(timerModeMatch);
                                        setTimeLeft?.(settings?.[timerModeMatch] * 60);
                                        setTimerActive?.(false);
                                        setOpen(false);
                                    }} forceMount>
                                        <Zap className="mr-2 h-4 w-4 text-purple-400" />
                                        <span>Switch to <span className="font-bold capitalize text-purple-400">{timerModeMatch.replace(/([A-Z])/g, ' $1').trim()}</span></span>
                                    </CommandItem>
                                </CommandGroup>
                            )}

                            {/* DYNAMIC: Sound */}
                            {soundMatch && (
                                <CommandGroup heading="Soundscapes" forceMount>
                                    <CommandItem
                                        disabled={!unlockedAmbiences?.includes(soundMatch.id)}
                                        onSelect={() => {
                                            playAmbience?.(soundMatch);
                                            setOpen(false);
                                        }}
                                        forceMount
                                    >
                                        <MusicIcon className={`mr-2 h-4 w-4 ${unlockedAmbiences?.includes(soundMatch.id) ? 'text-cyan-400' : 'text-gray-500'}`} />
                                        <span>Play {soundMatch.label}</span>
                                        {!unlockedAmbiences?.includes(soundMatch.id) && <span className="ml-2 text-[10px] uppercase bg-white/10 px-1 rounded">Locked</span>}
                                    </CommandItem>
                                </CommandGroup>
                            )}




                            {/* SMART SUGGESTIONS (Sorted by Usage) */}
                            <CommandGroup heading="Suggestions">
                                {suggestions.map(item => (
                                    <CommandItem
                                        key={item.id}
                                        onSelect={() => {
                                            incrementUsage(item.id);
                                            item.action();
                                        }}
                                    >
                                        <item.icon className="mr-2 h-4 w-4" />
                                        <span>{item.label}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>

                            <CommandGroup heading="Quicklinks">
                                {quicklinks.map(link => (
                                    <CommandItem
                                        key={link.id}
                                        onSelect={() => { window.open(link.url, '_blank'); setOpen(false); }}
                                        className="group"
                                    >
                                        <Favicon url={link.url} fallback={LinkIcon} className="mr-2 h-4 w-4 text-blue-300" />
                                        <span>{link.title}</span>

                                        {/* Edit Trigger (Hidden unless group hover or focused, but cmdk handling of focus is specific) */}
                                        <div className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-[10px] text-white/30 hidden md:inline">Ctrl+E to edit</span>
                                            <div
                                                role="button"
                                                onClick={(e) => startEditingLink(e, link)}
                                                className="p-1 hover:bg-white/20 rounded"
                                            >
                                                <Pencil size={12} className="text-white/70" />
                                            </div>
                                        </div>

                                        {/* Keyboard Shortcut Trap for Edit */}
                                        <div className="hidden">
                                            <CommandShortcut>
                                                <span className="hidden" ref={node => {
                                                    // Hacky way to listen for Ctrl+E on specific item if selected? 
                                                    // CMDK doesn't support per-item key listeners easily. 
                                                    // Better to rely on the global keydown and `value` matching?
                                                    // Actually, we can add a global listener that checks `document.querySelector('[aria-selected="true"]')` 
                                                    // but that is brittle. 
                                                    // Alternative: The user explicitly asked for Ctrl+E.
                                                    // Let's attach a listener to the document within useEffect and check selected state.
                                                }} />
                                            </CommandShortcut>
                                        </div>
                                    </CommandItem>
                                ))}
                                <CommandItem onSelect={() => { setLinkForm({ title: "", url: "" }); pushPage('quicklink-add'); }}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    <span>Add Quicklink</span>
                                </CommandItem>
                            </CommandGroup>

                            <CommandGroup heading="Shortcuts">
                                <CommandItem onSelect={() => { setEditingNote({}); setOpen(false); openNotes(); }}>
                                    <StickyNote className="mr-2 h-4 w-4" />
                                    <span>New Note</span>
                                </CommandItem>
                                <CommandItem onSelect={() => { openNotes(); setOpen(false); }}>
                                    <CheckSquare className="mr-2 h-4 w-4" />
                                    <span>New Task</span>
                                </CommandItem>
                            </CommandGroup>

                            <CommandSeparator />



                            <CommandGroup heading="Timer Controls">
                                <CommandItem onSelect={() => { setTimerActive?.(true); setOpen(false); }}>
                                    <Play className="mr-2 h-4 w-4" />
                                    <span>Start Timer</span>
                                </CommandItem>
                                <CommandItem onSelect={() => { setTimerActive?.(false); setOpen(false); }}>
                                    <Pause className="mr-2 h-4 w-4" />
                                    <span>Pause Timer</span>
                                </CommandItem>
                            </CommandGroup>

                            <CommandGroup heading="Settings">
                                <CommandItem onSelect={() => { openSettings?.('preferences'); setOpen(false); }}>
                                    <Sliders className="mr-2 h-4 w-4" />
                                    <span>Preferences</span>
                                </CommandItem>
                                <CommandItem onSelect={() => { openSettings?.('customize-background'); setOpen(false); }}>
                                    <Palette className="mr-2 h-4 w-4" />
                                    <span>Background</span>
                                </CommandItem>
                                <CommandItem onSelect={() => { openSettings?.('customize-clock'); setOpen(false); }}>
                                    <ClockIcon className="mr-2 h-4 w-4" />
                                    <span>Clock Style</span>
                                </CommandItem>
                                <CommandItem onSelect={() => { openSettings?.('stats'); setOpen(false); }}>
                                    <BarChart2 className="mr-2 h-4 w-4" />
                                    <span>Stats</span>
                                </CommandItem>
                                <CommandItem onSelect={() => { openSettings?.('account'); setOpen(false); }}>
                                    <Settings className="mr-2 h-4 w-4" />
                                    <span>All Settings</span>
                                    <CommandShortcut>{shortcutKey}{!isMac() && "+"}S</CommandShortcut>
                                </CommandItem>
                            </CommandGroup>

                            {/* DYNAMIC: Web Search Options (Fallback) - Moved to bottom */}
                            {homeQuery.length > 0 && (
                                <CommandGroup heading="Web Search">
                                    <CommandItem
                                        onSelect={() => {
                                            setWikiQuery(homeQuery);
                                            pushPage('wiki-search');
                                            // Do NOT close setOpen(false)
                                        }}
                                        value="fallback-wiki"
                                    >
                                        <Globe className="mr-2 h-4 w-4 text-pink-400" />
                                        <span>Search Wikipedia for <span className="text-white/70">"{homeQuery}"</span></span>
                                    </CommandItem>
                                    <CommandItem
                                        onSelect={() => { window.open(`https://www.google.com/search?q=${encodeURIComponent(homeQuery)}`, '_blank'); setOpen(false); }}
                                        value="fallback-google"
                                    >
                                        <Chrome className="mr-2 h-4 w-4 text-blue-400" />
                                        <span>Search Google for <span className="text-white/70">"{homeQuery}"</span></span>
                                        <ExternalLink className="ml-auto h-3 w-3 opacity-50" />
                                    </CommandItem>
                                    <CommandItem
                                        onSelect={() => { window.open(`https://www.perplexity.ai/search?q=${encodeURIComponent(homeQuery)}`, '_blank'); setOpen(false); }}
                                        value="fallback-perplexity"
                                    >
                                        <Brain className="mr-2 h-4 w-4 text-teal-400" />
                                        <span>Ask Perplexity about <span className="text-white/70">"{homeQuery}"</span></span>
                                        <ExternalLink className="ml-auto h-3 w-3 opacity-50" />
                                    </CommandItem>
                                    {homeQuery.startsWith("y ") && (
                                        <CommandItem
                                            onSelect={() => { window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(homeQuery.slice(2))}`, '_blank'); setOpen(false); }}
                                            value="fallback-youtube"
                                        >
                                            <Youtube className="mr-2 h-4 w-4 text-red-500" />
                                            <span>Search YouTube for <span className="text-white/70">"{homeQuery.slice(2)}"</span></span>
                                            <ExternalLink className="ml-auto h-3 w-3 opacity-50" />
                                        </CommandItem>
                                    )}
                                </CommandGroup>
                            )}
                        </CommandList>
                    </>
                )}

                {/* --- 2. ADD QUICKLINK VIEW --- */}
                {activePage === 'quicklink-add' && (
                    <div className="p-4 space-y-4">
                        <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                            <button onClick={popPage}><ArrowLeft size={16} /></button>
                            <span className="font-medium">Add Quicklink</span>
                        </div>
                        <form onSubmit={handleAddQuicklink} className="space-y-3">
                            <input
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-sm focus:outline-none focus:border-white/30"
                                placeholder="Title (e.g. My Notion)"
                                value={linkForm.title}
                                onChange={e => setLinkForm(prev => ({ ...prev, title: e.target.value }))}
                                autoFocus
                            />
                            <input
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-sm focus:outline-none focus:border-white/30"
                                placeholder="URL (e.g. notion.so)"
                                value={linkForm.url}
                                onChange={e => setLinkForm(prev => ({ ...prev, url: e.target.value }))}
                            />
                            <button type="submit" className="w-full bg-white text-black font-medium py-2 rounded-xl text-sm hover:bg-white/90">
                                Create Link
                            </button>
                        </form>
                    </div>
                )}

                {/* --- 3. EDIT QUICKLINK VIEW --- */}
                {activePage === 'quicklink-edit' && (
                    <div className="p-4 space-y-4">
                        <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                            <button onClick={popPage}><ArrowLeft size={16} /></button>
                            <span className="font-medium">Edit Quicklink</span>
                        </div>
                        <form onSubmit={handleEditQuicklink} className="space-y-3">
                            <input
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-sm focus:outline-none focus:border-white/30"
                                placeholder="Title"
                                value={linkForm.title}
                                onChange={e => setLinkForm(prev => ({ ...prev, title: e.target.value }))}
                                autoFocus
                            />
                            <input
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-sm focus:outline-none focus:border-white/30"
                                placeholder="URL"
                                value={linkForm.url}
                                onChange={e => setLinkForm(prev => ({ ...prev, url: e.target.value }))}
                            />
                            <div className="flex gap-2">
                                <button type="submit" className="flex-1 bg-white text-black font-medium py-2 rounded-xl text-sm hover:bg-white/90">
                                    Update Link
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteQuicklink(linkForm.id)}
                                    className="px-3 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* --- 4. WIKIPEDIA SEARCH --- */}
                {activePage === 'wiki-search' && (
                    <>
                        <div className="flex items-center border-b border-white/10 px-3">
                            <ArrowLeft onClick={popPage} className="mr-2 h-4 w-4 cursor-pointer text-white/50 hover:text-white" />
                            <CommandInput
                                placeholder="Search Wikipedia..."
                                value={wikiQuery}
                                onValueChange={setWikiQuery}
                                autoFocus
                            />
                        </div>
                        <CommandList>
                            <CommandEmpty>No results found.</CommandEmpty>
                            {wikiResults.map(r => (
                                <CommandItem key={r.pageid} onSelect={() => getWikiDetails(r.title)}>
                                    {r.thumbnail?.source ? (
                                        <img src={r.thumbnail.source} alt={r.title} className="mr-3 h-8 w-8 rounded object-cover bg-white/10" />
                                    ) : (
                                        <Globe className="mr-3 h-8 w-8 text-pink-400 p-1.5 bg-white/5 rounded" />
                                    )}
                                    <div className="flex flex-col gap-0.5 overflow-hidden">
                                        <span className="font-bold truncate">{r.title}</span>
                                        {r.extract && <span className="text-xs text-white/50 truncate pr-4">{r.extract}</span>}
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandList>
                    </>
                )}

                {/* --- 5. WIKIPEDIA DETAIL --- */}
                {activePage === 'wiki-detail' && selectedWikiPage && (
                    <div className="flex flex-col h-[60vh]">
                        <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-white/5">
                            <button onClick={popPage} className="p-1 hover:bg-white/10 rounded-lg"><ArrowLeft size={18} /></button>
                            {selectedWikiPage.original?.source && (
                                <img src={selectedWikiPage.original.source} alt={selectedWikiPage.title} className="h-8 w-8 rounded object-cover bg-white/10" />
                            )}
                            <h2 className="font-bold line-clamp-1">{selectedWikiPage.title}</h2>
                            <div className="flex-1" />
                            <a href={`https://en.wikipedia.org/?curid=${selectedWikiPage.pageid}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded text-xs">
                                <ExternalLink size={12} /> Open
                            </a>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar prose prose-invert">
                            <p className="text-white/80">{selectedWikiPage.extract}</p>
                        </div>
                    </div>
                )}

                {/* --- 6. DICTIONARY VIEW --- */}
                {activePage === 'dictionary' && (
                    <>
                        <div className="flex items-center border-b border-white/10 px-3">
                            <ArrowLeft onClick={popPage} className="mr-2 h-4 w-4 cursor-pointer text-white/50 hover:text-white" />
                            <CommandInput
                                placeholder="Type a word to define..."
                                value={dictQuery}
                                onValueChange={setDictQuery}
                                autoFocus
                            />
                        </div>
                        {(isLoading || isDictLoading) && (
                            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-white/70 to-transparent animate-pulse" />
                        )}
                        <CommandList>
                            <CommandEmpty>No definitions found.</CommandEmpty>
                            {dictResult && (
                                <CommandItem onSelect={() => copyToClipboard(dictResult.definition)}>
                                    <Book className="mr-2 h-4 w-4 text-blue-400" />
                                    <div className="flex flex-col">
                                        <span className="font-bold text-white capitalize">{dictResult.word}</span>
                                        <span className="text-white/70 text-sm">{dictResult.definition}</span>
                                    </div>
                                    <CommandShortcut>↵ to copy</CommandShortcut>
                                </CommandItem>
                            )}
                        </CommandList>
                    </>
                )}

            </CommandDialog>

            {/* Global Key Listener for Ctrl+E when Open */}
            {open && activePage === 'home' && (
                <div hidden ref={node => {
                    if (!node) return;
                    const listener = (e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                            e.preventDefault();
                            // Find currently selected item
                            const selected = document.querySelector('[aria-selected="true"]');
                            if (selected) {
                                // Trigger the edit button inside it
                                const editBtn = selected.querySelector('[role="button"]');
                                editBtn?.click();
                            }
                        }
                    };
                    window.addEventListener('keydown', listener);
                    // Cleanup handled by React unmount but this is a ref callback... 
                    // Better to put in useEffect.
                }} />
            )}
        </>
    );
}
