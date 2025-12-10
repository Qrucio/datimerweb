import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, X, Loader2 } from 'lucide-react';
import { signInWithPopup, signInAnonymously } from "firebase/auth";
import { collection, query, where, getDocs, doc, writeBatch } from "firebase/firestore";

// --- SUB-COMPONENTS (Move these here or import them) ---
const GoogleLogo = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
        <g transform="matrix(1, 0, 0, 1, 27.009001, -39.23856)">
            <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
            <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
            <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
            <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.799 L -6.734 42.379 C -8.804 40.439 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
        </g>
    </svg>
);

const StaggeredText = ({ text }) => (
    <span className="inline-flex flex-wrap justify-center gap-x-2">
        {text.split(" ").map((word, i) => (
            <span key={i} className="word-animate" style={{ animationDelay: `${i * 0.15}s` }}>{word}</span>
        ))}
    </span>
);

const RevealLogo = ({ src, className }) => (
    <motion.img src={src} alt="Logo" className={className} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
);

// --- MAIN COMPONENT ---
const OnboardingFlow = ({ db, auth, provider, user, isMigrating, onComplete }) => {
    // INTERNAL STATE (Removed from App.jsx)
    const [internalStep, setInternalStep] = useState(0); // 0 = Login, 1 = Handle
    const [greetingText, setGreetingText] = useState("Hello, stranger");
    const [showLoginBtn, setShowLoginBtn] = useState(true);

    // Handle State
    const [onboardingHandle, setOnboardingHandle] = useState("");
    const [handleStatus, setHandleStatus] = useState("idle");
    const [handleSuggestions, setHandleSuggestions] = useState([]);
    const [isSavingHandle, setIsSavingHandle] = useState(false);

    // --- EFFECT: Handle Login Success -> Move to Step 1 ---
    useEffect(() => {
        if (user && internalStep === 0) {
            if (user.isAnonymous) {
                onComplete();
                return;
            }
            // Logic from your App.jsx to check if we skip to dashboard is done in App.jsx
            // If we are still rendered, it means we need to do the Handle step
            handleNameTransition(user.displayName ? user.displayName.split(' ')[0] : 'User');
        }
    }, [user, internalStep]);

    // --- EFFECT: Handle Availability Checker ---
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (internalStep === 1 && onboardingHandle.length >= 3) {
                // Ignore if matches current user (unlikely in onboarding)
                if (user?.handle && onboardingHandle.toLowerCase() === user.handle.replace(/^@/, '').toLowerCase()) {
                    setHandleStatus("available");
                    return;
                }

                const fullHandle = `@${onboardingHandle}`;
                const q = query(collection(db, "publicProfiles"), where("handle_lowercase", "==", fullHandle.toLowerCase()));
                const snap = await getDocs(q);

                if (snap.empty) {
                    setHandleStatus("available");
                } else {
                    setHandleStatus("taken");
                    const base = onboardingHandle.replace(/[^a-zA-Z0-9_]/g, '');
                    setHandleSuggestions([
                        `${base}_${Math.floor(Math.random() * 99)}`,
                        `${base}${new Date().getFullYear()}`,
                        `its_${base}`
                    ]);
                }
            } else if (onboardingHandle.length > 0 && onboardingHandle.length < 3) {
                setHandleStatus("idle");
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [onboardingHandle, internalStep, user, db]);

    // --- ANIMATION LOGIC ---
    const handleNameTransition = async (newName) => {
        setShowLoginBtn(false);
        await new Promise(r => setTimeout(r, 800));
        // Typing effect logic
        setGreetingText(`Hello, ${newName}`); // Simplified for brevity
        await new Promise(r => setTimeout(r, 1200));

        // Auto-suggest handle
        const suggested = newName.replace(/\s+/g, '').toLowerCase().slice(0, 10);
        setOnboardingHandle(suggested);

        setInternalStep(1);
    };

    const handleLogin = async () => { try { await signInWithPopup(auth, provider); } catch (e) { console.error(e); } };

    const handleGuestLogin = async () => {
        try { await signInAnonymously(auth); } catch (e) { console.error(e); }
    };

    const confirmHandleAndContinue = async () => {
        if (handleStatus !== 'available' || !onboardingHandle) return;
        setIsSavingHandle(true);
        const fullHandle = `@${onboardingHandle}`;
        localStorage.setItem('zen_user_handle', fullHandle);

        try {
            const batch = writeBatch(db);
            // Public Profile
            const publicRef = doc(db, "publicProfiles", user.uid);
            batch.set(publicRef, {
                uid: user.uid,
                displayName: user.displayName || "User",
                photoURL: user.photoURL || null,
                handle: fullHandle,
                handle_lowercase: fullHandle.toLowerCase(),
                isPro: false,
                stats: { dailyFocusTime: 0, dailyBreakTime: 0, dailySessions: 0 } // Default stats
            }, { merge: true });

            // Private User
            const userRef = doc(db, "users", user.uid);
            batch.set(userRef, {
                handle: fullHandle,
                lastHandleChange: Date.now()
            }, { merge: true });

            await batch.commit();

            setTimeout(() => {
                setIsSavingHandle(false);
                onComplete(); // Tell App.jsx we are done
            }, 500);

        } catch (e) {
            console.error("Error saving handle:", e);
            setIsSavingHandle(false);
        }
    };

    return (
        <>
            {/* STEP 0: LOGIN */}
            <div className={`fixed inset-0 z-50 bg-black flex flex-col items-center justify-center transition-all duration-1000 ${internalStep === 0 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <h1 className="relative z-10 font-serif-display italic text-4xl md:text-6xl text-white tracking-tight min-h-[80px] flex items-center">
                    {greetingText === "Hello, stranger" ? <StaggeredText text={greetingText} /> : greetingText}
                </h1>

                {showLoginBtn && (
                    <div className="absolute bottom-20 md:bottom-32 animate-fade-in opacity-0 flex flex-col items-center gap-4" style={{ animationDelay: '1.5s', animationFillMode: 'forwards' }}>
                        <button onClick={handleLogin} className="group flex items-center gap-3 px-6 py-3 border border-white/20 rounded-full hover:bg-white/10 transition-all hover:border-white/50">
                            <GoogleLogo />
                            <span className="text-sm tracking-widest uppercase text-white/80 group-hover:text-white">Sign in with Google</span>
                        </button>
                        <button onClick={handleGuestLogin} className="text-xs text-white/30 hover:text-white uppercase tracking-widest transition-colors font-medium px-4 py-2">
                            Continue as Guest
                        </button>
                    </div>
                )}
            </div>

            {/* STEP 1: HANDLE */}
            {internalStep === 1 && (
                <div className={`fixed inset-0 z-40 bg-black flex flex-col items-center justify-center transition-all duration-700 opacity-100 blur-enter pointer-events-auto`}>
                    <div className="w-full max-w-4xl px-8 flex flex-col items-center">
                        <h2 className="font-serif-display text-3xl md:text-4xl text-white/90 text-center leading-tight mb-12">
                            {isMigrating ? <StaggeredText text="We're moving to usernames. Claim yours." /> : <StaggeredText text="Claim your identity." />}
                        </h2>

                        <div className="relative w-full flex flex-col items-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                            <div className="relative flex items-center justify-center">
                                <span className="text-3xl md:text-5xl font-light text-white/30 select-none mr-0.5 transform -translate-y-[1px]">@</span>
                                <div className="relative min-w-[20px]">
                                    <span className="invisible text-3xl md:text-5xl font-light whitespace-pre block h-full min-w-[1ch] px-1">{onboardingHandle || "username"}</span>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={onboardingHandle}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15);
                                            setOnboardingHandle(val);
                                            if (val !== onboardingHandle) setHandleStatus("checking");
                                        }}
                                        onKeyDown={(e) => e.key === 'Enter' && confirmHandleAndContinue()}
                                        className="absolute inset-0 w-full h-full bg-transparent border-none outline-none text-3xl md:text-5xl font-light text-white placeholder-white/10 text-left p-0 m-0 focus:ring-0 px-1"
                                        placeholder="username"
                                        spellCheck={false}
                                    />
                                </div>
                                <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 flex items-center">
                                    {handleStatus === 'checking' && <Loader2 size={24} className="animate-spin text-white/30" />}
                                    {handleStatus === 'available' && onboardingHandle.length > 0 && (
                                        <div className="bg-green-500/20 p-1 rounded-full border border-green-500/50"><Check size={16} className="text-green-400" strokeWidth={3} /></div>
                                    )}
                                    {handleStatus === 'taken' && (
                                        <div className="bg-red-500/20 p-1 rounded-full border border-red-500/50"><X size={16} className="text-red-400" strokeWidth={3} /></div>
                                    )}
                                </div>
                            </div>

                            <div className="h-24 mt-8 flex flex-col items-center justify-start w-full">
                                <AnimatePresence mode="wait">
                                    {handleStatus === 'taken' && (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col items-center gap-3">
                                            <span className="text-red-400 text-sm font-medium">That handle is taken. Try one of these?</span>
                                            <div className="flex flex-wrap justify-center gap-3">
                                                {handleSuggestions.map((s) => (
                                                    <button key={s} onClick={() => { setOnboardingHandle(s); setHandleStatus("available"); }} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 text-white/70 hover:text-white text-sm transition-all">@{s}</button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                    {handleStatus === 'available' && onboardingHandle.length > 0 && (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-4">
                                            <button onClick={confirmHandleAndContinue} disabled={isSavingHandle} className="group flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors">
                                                <span>{isSavingHandle ? "Setting up..." : "Press Enter to continue"}</span>
                                                {!isSavingHandle && <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />}
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default OnboardingFlow;