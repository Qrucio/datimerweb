// --- SUPABASE IMPORTS ---
import { supabase } from '../lib/supabase';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, X, Loader2, Mail, ArrowLeft, Lock, Eye, EyeOff, Search, MessageCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

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
const OnboardingFlow = ({ user, isMigrating, onComplete, currentStep: propStep, onStepChange }) => {
    // INTERNAL STATE - Controlled
    const [localStep, setLocalStep] = useState(0);
    const internalStep = propStep !== undefined ? propStep : localStep;
    const setInternalStep = (val) => {
        setLocalStep(val);
        if (onStepChange) onStepChange(val);
    };
    const [greetingText, setGreetingText] = useState("Hello, stranger");
    const [showLoginBtn, setShowLoginBtn] = useState(true);

    // Auth Mode State (Email Flow)
    const [authMode, setAuthMode] = useState('menu'); // 'menu', 'signin', 'signup'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [lastAuthMethod, setLastAuthMethod] = useState(null);
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState(null);

    useEffect(() => {
        const last = localStorage.getItem('lastAuthMethod');
        if (last) setLastAuthMethod(last);
    }, []);

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
            // If user is here, they are logged in.
            // Check if they already have a handle to satisfy strict onboarding logic?
            // Actually App.jsx handles the check. If we are rendered, we need a handle.
            handleNameTransition(user.displayName ? user.displayName.split(' ')[0] : 'User');
        }
    }, [user, internalStep]);

    // --- EFFECT: Handle Availability Checker ---
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (internalStep === 1 && onboardingHandle.length >= 3) {
                // Ignore if matches current user logic... (Supabase user might have handle in metadata?)
                // We'll check against DB directly.

                const clean = onboardingHandle.toLowerCase();

                // Check against both "handle" and "@handle" variations using the authoritative RPC
                const [resClean, resAt] = await Promise.all([
                    supabase.rpc('check_handle', { handle_str: clean }),
                    supabase.rpc('check_handle', { handle_str: `@${clean}` })
                ]);

                // RPC returns TRUE if available (not taken by others).
                // If either format is taken by someone else, verify fails.
                const available = (resClean.data !== false) && (resAt.data !== false);

                if (available) {
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
    }, [onboardingHandle, internalStep, user]);

    // --- ANIMATION LOGIC ---
    const handleNameTransition = async (newName) => {
        setShowLoginBtn(false);
        await new Promise(r => setTimeout(r, 800));
        setGreetingText(`Hello, ${newName}`);
        await new Promise(r => setTimeout(r, 1200));

        const suggested = newName.replace(/\s+/g, '').toLowerCase().slice(0, 10);
        setOnboardingHandle(suggested);
        setInternalStep(1);
    };

    const handleCheckEmail = async () => {
        if (!email || !email.includes('@')) {
            setAuthError("Please enter a valid email.");
            return;
        }
        setAuthLoading(true);
        setAuthError(null);

        // Smart User Detection
        // 1. Try to see if we can find them in profiles using the email logic
        //    (Note: This relies on Policies allowing us to see this, or us handling the error gracefully)
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', email)
                .maybeSingle();

            if (data) {
                // User exists!
                setAuthMode('signin');
            } else {
                // User does not exist (or RLS hides it) -> Assume Sign Up
                setAuthMode('signup');
            }
        } catch (e) {
            // Fallback: Assume new user if check fails
            console.error("Check email error:", e);
            setAuthMode('signup');
        } finally {
            setAuthLoading(false);
        }
    };


    const handleGoogleLogin = async () => {
        try {
            localStorage.setItem('lastAuthMethod', 'google');
            await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/`
                }
            });
        } catch (e) { console.error(e); }
    };

    const handleGuestLogin = async () => {
        try { await supabase.auth.signInAnonymously(); } catch (e) { console.error(e); }
    };

    const handleEmailAuth = async (isSignUp) => {
        if (!email || !password) {
            setAuthError("Please fill in all fields.");
            return;
        }
        if (isSignUp && password !== confirmPassword) {
            setAuthError("Passwords do not match.");
            return;
        }

        setAuthLoading(true);
        setAuthError(null);
        try {
            let error;
            if (isSignUp) {
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: email.split('@')[0] } // Make displayName usable immediately
                    }
                });
                error = signUpError;
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                error = signInError;
            }

            if (error) throw error;
            localStorage.setItem('lastAuthMethod', 'email');
            // Success handled by user effect
        } catch (e) {
            console.error("Email auth error:", e);
            setAuthError(e.message || "Authentication failed");
        } finally {
            setAuthLoading(false);
        }
    };

    const confirmHandleAndContinue = async () => {
        if (handleStatus !== 'available' || !onboardingHandle) return;
        setIsSavingHandle(true);
        const fullHandle = onboardingHandle; // Store without @ prefix
        localStorage.setItem('zen_user_handle', fullHandle);

        try {
            // 1. Update Profile
            await supabase.from('profiles').upsert({
                id: user.id, // Supabase maps uid to id
                email: user.email,
                display_name: user.displayName || "User",
                photo_url: user.photoURL,
                handle: fullHandle,
                handle_lowercase: fullHandle.toLowerCase(),
                // Initialize default stats if needed, or rely on defaults

                // [TEMPORARY] GRANT PRO TO ALL NEW USERS
                // TODO: Remove this block when beta testing is complete
                is_pro: true,
                pro_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 Year Trial
            });

            // 2. Update Settings (Private) - store last handle change
            // We'll just update the settings JSONB blob
            // First fetch existing to be safe, or just upsert merge
            // Supabase upsert on JSONB columns replaces value unless using specialized logic,
            // but here we just blindly init or update.
            // For now, let's just ignore lastHandleChange in user_settings or do a simple fetch/update if critical.
            // Simplified: we trust the triggered creation in migration mostly, or just upsert.

            // For now we skip lastHandleChange logic or put it in metadata if needed.
            // Let's just proceed.

            setTimeout(() => {
                setIsSavingHandle(false);
                setInternalStep(2);
            }, 500);

        } catch (e) {
            console.error("Error saving handle:", e);
            setIsSavingHandle(false);
        }
    };

    // --- STARS CSS ---
    const starsCss = `
        @keyframes twinkle {
            0% { opacity: 0.2; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.2); }
            100% { opacity: 0.2; transform: scale(0.8); }
        }
        .star {
            position: absolute;
            background: white;
            border-radius: 50%;
            animation: twinkle 4s infinite ease-in-out;
        }
    `;

    // Generate random stars
    const stars = React.useMemo(() => {
        return Array.from({ length: 60 }).map((_, i) => ({
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            size: Math.random() < 0.7 ? 1 : 2,
            delay: Math.random() * 5
        }));
    }, []);

    return (
        <div className="fixed inset-0 z-50 bg-[#020202] overflow-hidden text-white font-sans selection:bg-white/30 font-light">
            <style>{starsCss}</style>

            {/* Stars Background */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-50">
                {stars.map((s, i) => (
                    <div
                        key={i}
                        className="star"
                        style={{
                            top: s.top,
                            left: s.left,
                            width: s.size,
                            height: s.size,
                            animationDelay: `${s.delay}s`
                        }}
                    />
                ))}
            </div>

            {/* Gradient Overlay for Depth */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-blue-900/10 pointer-events-none" />

            {/* MAIN CONTENT AREA */}
            <AnimatePresence mode="wait">
                {/* STEP 0: LOGIN */}
                {internalStep === 0 && (
                    <motion.div
                        key="step0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 z-10 flex flex-col items-center justify-center"
                    >

                        {/* Header Section */}
                        <div className={`flex flex-col items-center mb-16 transition-opacity duration-700 ${authMode === 'menu' ? 'opacity-100' : 'opacity-0 pointer-events-none absolute'}`}>
                            <img src="/logo/altimerwhite.png" className="w-32 h-32 mb-8 opacity-90 animate-fade-in drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" alt="Altimer" />
                            <h2 className="text-4xl md:text-6xl text-white font-extralight tracking-tight animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                                Time is relative. Come bend it.
                            </h2>
                        </div>

                        {showLoginBtn && (
                            <div className="w-full max-w-sm px-8 animate-fade-in opacity-0" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
                                <AnimatePresence mode="wait">
                                    {authMode === 'menu' ? (
                                        <motion.div
                                            key="menu"
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                                            className="flex flex-col items-center gap-4 w-full"
                                        >
                                            <button onClick={handleGoogleLogin} className="group relative w-full flex items-center justify-center gap-3 px-6 py-4 border border-white/10 rounded-full hover:bg-white/5 transition-all duration-500 overflow-visible">
                                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full" />
                                                <GoogleLogo />
                                                <span className="text-sm font-light tracking-widest text-white/90 group-hover:tracking-[0.2em] transition-all duration-500">CONTINUE WITH GOOGLE</span>
                                                {lastAuthMethod === 'google' && (
                                                    <span className="absolute -top-3 right-4 bg-white text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.4)] tracking-widest z-10">LAST USED</span>
                                                )}
                                            </button>

                                            <button onClick={() => { setAuthMode('email-input'); setAuthError(null); setEmail(''); setPassword(''); }} className="group relative w-full flex items-center justify-center gap-3 px-6 py-4 border border-white/10 rounded-full hover:bg-white/5 transition-all duration-500 overflow-visible">
                                                <Mail size={16} className="text-white/60 group-hover:text-white transition-colors" />
                                                <span className="text-sm font-light tracking-widest text-white/60 group-hover:text-white group-hover:tracking-[0.2em] transition-all duration-500">USE EMAIL</span>
                                                {lastAuthMethod === 'email' && (
                                                    <span className="absolute -top-3 right-4 bg-white text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.4)] tracking-widest z-10">LAST USED</span>
                                                )}
                                            </button>

                                            <button onClick={handleGuestLogin} className="mt-6 text-[10px] text-white/20 hover:text-white/80 uppercase tracking-[0.2em] transition-all duration-500 hover:tracking-[0.3em]">
                                                Enter as Guest
                                            </button>
                                        </motion.div>
                                    ) : authMode === 'email-input' ? (
                                        <motion.div
                                            key="email-input"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            className="flex flex-col gap-6 w-full"
                                        >
                                            <div className="text-center">
                                                <button onClick={() => { setAuthMode('menu'); setAuthError(null); }} className="mb-4 text-white/30 hover:text-white transition-colors">
                                                    <ArrowLeft size={20} />
                                                </button>
                                                <h3 className="text-xl font-light text-white tracking-wide">Enter your email</h3>
                                            </div>

                                            {authError && <div className="text-center text-red-400 text-xs tracking-wide animate-shake">{authError}</div>}

                                            <input
                                                type="email"
                                                placeholder="user@example.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleCheckEmail()}
                                                autoFocus
                                                className="w-full bg-transparent border-b border-white/20 py-3 text-center text-white text-lg placeholder-white/10 focus:outline-none focus:border-white/60 transition-colors"
                                            />

                                            <button
                                                onClick={handleCheckEmail}
                                                disabled={authLoading}
                                                className="w-full py-4 mt-4 bg-white/5 border border-white/10 rounded-full text-white font-light tracking-widest text-xs hover:bg-white hover:text-black transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 uppercase"
                                            >
                                                {authLoading && <Loader2 size={14} className="animate-spin" />}
                                                Continue
                                            </button>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="password-form"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            className="flex flex-col gap-6 w-full"
                                        >
                                            <div className="text-center relative">
                                                <button onClick={() => { setAuthMode('email-input'); setAuthError(null); }} className="absolute left-0 top-1 text-white/30 hover:text-white transition-colors">
                                                    <ArrowLeft size={20} />
                                                </button>
                                                <h3 className="text-xl font-light text-white tracking-wide">{authMode === 'signin' ? 'Welcome back.' : 'Join us.'}</h3>
                                                <p className="text-xs text-white/30 mt-1">{email}</p>
                                            </div>

                                            {authError && <div className="text-center text-red-400 text-xs tracking-wide animate-shake">{authError}</div>}

                                            <div className="space-y-4">
                                                <div className="relative">
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        placeholder="Password"
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && (authMode === 'signup' ? null : handleEmailAuth(false))}
                                                        autoFocus
                                                        className="w-full bg-transparent border-b border-white/20 py-3 text-center text-white text-lg placeholder-white/10 focus:outline-none focus:border-white/60 transition-colors pr-8"
                                                    />
                                                    <button onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors">
                                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>

                                                {authMode === 'signup' && (
                                                    <div className="relative animate-fade-in-up">
                                                        <input
                                                            type={showPassword ? "text" : "password"}
                                                            placeholder="Confirm Password"
                                                            value={confirmPassword}
                                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleEmailAuth(true)}
                                                            onPaste={(e) => e.preventDefault()}
                                                            className="w-full bg-transparent border-b border-white/20 py-3 text-center text-white text-lg placeholder-white/10 focus:outline-none focus:border-white/60 transition-colors pr-8"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => handleEmailAuth(authMode === 'signup')}
                                                disabled={authLoading}
                                                className="w-full py-4 mt-4 bg-white/5 border border-white/10 rounded-full text-white font-light tracking-widest text-xs hover:bg-white hover:text-black transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 uppercase"
                                            >
                                                {authLoading && <Loader2 size={14} className="animate-spin" />}
                                                {authMode === 'signin' ? 'Enter' : 'Create'}
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* STEP 1: HANDLE */}
                {internalStep === 1 && (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                        transition={{ duration: 0.5 }}
                        className="fixed inset-0 z-40 flex flex-col items-center justify-center"
                    >
                        <div className="w-full max-w-4xl px-8 flex flex-col items-center">
                            <h2 className="text-3xl md:text-5xl text-white font-extralight tracking-tight text-center leading-tight mb-16 animate-fade-in">
                                <span className="block text-sm tracking-[0.4em] text-white/50 uppercase mb-4">Identity</span>
                                {isMigrating ? "Claim your username." : "What shall we call you?"}
                            </h2>

                            <div className="relative w-full flex flex-col items-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                                <div className="relative flex items-center justify-center p-4">
                                    <span className="text-4xl md:text-6xl font-thin text-white/20 select-none mr-2 leading-relaxed">@</span>
                                    <div className="relative min-w-[20px]">
                                        <span className="invisible text-4xl md:text-6xl font-thin whitespace-pre block h-full min-w-[1ch] px-4 leading-relaxed tracking-normal">{onboardingHandle || "user"}</span>
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
                                            className="absolute inset-0 w-full h-full bg-transparent border-none outline-none text-4xl md:text-6xl font-thin text-white placeholder-white/10 text-left p-0 m-0 focus:ring-0 px-4 leading-relaxed tracking-normal"
                                            placeholder="user"
                                            spellCheck={false}
                                        />
                                    </div>
                                    <div className="absolute left-full ml-6 top-1/2 -translate-y-1/2 flex items-center">
                                        {handleStatus === 'checking' && <Loader2 size={24} className="animate-spin text-white/30" />}
                                        {handleStatus === 'available' && onboardingHandle.length > 0 && (
                                            <div className="bg-green-500/10 p-2 rounded-full border border-green-500/30"><Check size={20} className="text-green-400" strokeWidth={2} /></div>
                                        )}
                                        {handleStatus === 'taken' && (
                                            <div className="bg-red-500/10 p-2 rounded-full border border-red-500/30"><X size={20} className="text-red-400" strokeWidth={2} /></div>
                                        )}
                                    </div>
                                </div>

                                <div className="h-32 mt-12 flex flex-col items-center justify-start w-full">
                                    <AnimatePresence mode="wait">
                                        {handleStatus === 'taken' && (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col items-center gap-4">
                                                <span className="text-red-400/80 text-xs tracking-widest uppercase">Taken. Try these?</span>
                                                <div className="flex flex-wrap justify-center gap-3">
                                                    {handleSuggestions.map((s) => (
                                                        <button key={s} onClick={() => { setOnboardingHandle(s); setHandleStatus("available"); }} className="px-4 py-2 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 text-white/60 hover:text-white text-xs tracking-wider transition-all">@{s}</button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                        {handleStatus === 'available' && onboardingHandle.length > 0 && (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-2">
                                                <button onClick={confirmHandleAndContinue} disabled={isSavingHandle} className="group flex items-center gap-3 px-8 py-3 bg-white text-black rounded-full font-medium tracking-widest text-xs uppercase hover:scale-105 transition-all">
                                                    <span>{isSavingHandle ? "Initializing..." : "Begin"}</span>
                                                    {!isSavingHandle && <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />}
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* STEP 2: COMMAND BAR INTRO */}
                {internalStep === 2 && (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.5 }}
                        className="fixed inset-0 z-40 bg-black/90 flex flex-col items-center justify-center backdrop-blur-md"
                    >
                        <div className="flex flex-col items-center max-w-lg text-center px-8 animate-fade-in-up">
                            <div className="relative mb-12 group">
                                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000" />
                                <div className="relative p-8 bg-gradient-to-b from-white/10 to-transparent rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl group-hover:scale-105 transition-transform duration-500">
                                    <Search size={64} className="text-white" strokeWidth={1} />
                                </div>
                                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/80 border border-white/20 rounded-full text-xs font-mono text-white/70 whitespace-nowrap">
                                    Ctrl + Space
                                </div>
                            </div>

                            <h2 className="text-3xl md:text-4xl text-white font-extralight tracking-tight mb-6">
                                Command everything.
                            </h2>

                            <p className="text-white/50 text-lg font-light leading-relaxed max-w-sm mb-12">
                                Press <strong className="text-white font-medium">Ctrl + Space</strong> to access the Command Bar anytime. Control music, timer, and notes without dragging your mouse.
                            </p>

                            <div className="mt-4 flex flex-col items-center gap-2 animate-pulse">
                                <span className="text-white/30 text-xs font-mono tracking-widest uppercase">Waiting for input...</span>
                            </div>
                        </div>
                    </motion.div>
                )
                }

                {/* STEP 3: SOCIAL INTRO */}
                {internalStep === 3 && (
                    <motion.div
                        key="step3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="fixed inset-0 z-40 bg-black/90 flex flex-col items-center justify-center backdrop-blur-md"
                    >
                        <div className="flex flex-col items-center max-w-lg text-center px-8 animate-fade-in-up">
                            <div className="relative mb-12 group">
                                <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000" />
                                <div className="relative p-8 bg-gradient-to-b from-white/10 to-transparent rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl group-hover:scale-105 transition-transform duration-500">
                                    <MessageCircle size={64} className="text-white" strokeWidth={1} />
                                </div>
                            </div>

                            <h2 className="text-3xl md:text-4xl text-white font-extralight tracking-tight mb-6">
                                Stay connected.
                            </h2>

                            <p className="text-white/50 text-lg font-light leading-relaxed max-w-sm mb-12">
                                Chat with friends, share your status, and keep each other accountable in real-time.
                            </p>

                            <button
                                onClick={() => {
                                    onComplete();
                                    window.location.reload();
                                }}
                                onMouseEnter={() => {
                                    confetti({
                                        particleCount: 100,
                                        spread: 70,
                                        origin: { y: 0.6 }
                                    });
                                }}
                                className="group px-12 py-4 bg-white text-black rounded-full font-bold tracking-widest text-xs uppercase hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all duration-500"
                            >
                                Let's go
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div >
    );

};

export default OnboardingFlow;