import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogIn, UserPlus, Shield, Loader2, CheckCircle } from 'lucide-react'

export default function Login() {
    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [role, setRole] = useState('student')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)

    const { signIn, signUp } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(null)

        try {
            const isAdminEmail = email.toLowerCase() === 'prasanthanandarajan@gmail.com'
            const isCollegeEmail = email.toLowerCase().endsWith('@hicas.ac.in')

            if (isLogin) {
                if (!isAdminEmail && !isCollegeEmail) {
                    throw new Error('Access Denied: Please use your @hicas.ac.in college email to login.')
                }
                const { data, error } = await signIn({ email, password })
                if (error) {
                    if (error.message === 'Invalid login credentials') {
                        throw new Error('Wrong email or password. If you just signed up, make sure you confirmed your email or wait a moment and try again.')
                    }
                    if (error.message?.includes('Email not confirmed')) {
                        throw new Error('Please confirm your email first. Check your inbox for the confirmation link.')
                    }
                    throw error
                }
                if (data?.session) {
                    navigate('/')
                }
            } else {
                if (!isCollegeEmail) {
                    throw new Error('Sign-up Restricted: Only @hicas.ac.in college emails are allowed to create accounts.')
                }

                if (password.length < 6) {
                    throw new Error('Password must be at least 6 characters.')
                }

                const { data, error } = await signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: fullName, role: role },
                        emailRedirectTo: window.location.origin
                    }
                })

                if (error) {
                    if (error.message?.includes('already registered') || error.message?.includes('already been registered')) {
                        throw new Error('This email is already registered. Try logging in instead!')
                    }
                    if (error.message?.includes('rate limit')) {
                        throw new Error('Too many attempts. Please wait 1-2 minutes and try again.')
                    }
                    if (error.message?.includes('valid email')) {
                        throw new Error('Please use a valid email address (e.g. yourname@gmail.com)')
                    }
                    throw new Error(error.message || 'Signup failed. Please try again.')
                }

                // If session exists, user is auto-confirmed -> go to app
                if (data?.session) {
                    navigate('/')
                    return
                }

                // If user exists but no session, email confirmation is needed
                if (data?.user) {
                    setSuccess('✅ Account created! Check your email for a confirmation link, then come back and log in.')
                    setIsLogin(true)
                    setPassword('')
                } else {
                    // Fallback
                    setSuccess('✅ Account created! Switch to Login and sign in.')
                    setIsLogin(true)
                }
            }
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4 lg:p-12 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-600/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse transition-all duration-500 delay-700"></div>

            <div className="w-full max-w-[440px] relative z-10 animate-fade-in">
                <div className="text-center mb-10">
                    <div className="inline-flex w-20 h-20 bg-primary-600 rounded-3xl items-center justify-center text-white mb-6 transform rotate-12 shadow-2xl shadow-primary-600/30 ring-4 ring-white/5">
                        <Shield size={40} className="drop-shadow-lg" />
                    </div>
                    <h2 className="text-4xl font-extrabold text-[var(--foreground)] tracking-tight">CollegeCommunity</h2>
                    <p className="text-[var(--text-muted)] mt-2 font-medium">Connecting Minds, Moderated by AI</p>
                </div>

                <div className="glass-card p-6 lg:p-10 shadow-2xl bg-[var(--card-bg)] border-[var(--card-border)]">
                    <div className="flex p-1.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-2xl mb-8">
                        <button
                            onClick={() => { setIsLogin(true); setError(null); setSuccess(null) }}
                            className={cn(
                                "flex-1 py-3 rounded-[14px] text-sm font-bold transition-all duration-300",
                                isLogin
                                    ? "bg-primary-600 text-white shadow-xl shadow-primary-600/20"
                                    : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
                            )}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => { setIsLogin(false); setError(null); setSuccess(null) }}
                            className={cn(
                                "flex-1 py-3 rounded-[14px] text-sm font-bold transition-all duration-300",
                                !isLogin
                                    ? "bg-primary-600 text-white shadow-xl shadow-primary-600/20"
                                    : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
                            )}
                        >
                            Sign Up
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[11px] font-black text-primary-600 mb-1.5 block uppercase tracking-widest pl-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="input-style w-full px-5 py-3.5"
                                        placeholder="John Doe"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-black text-primary-600 mb-1.5 block uppercase tracking-widest pl-1">I am a...</label>
                                    <div className="relative">
                                        <select
                                            value={role}
                                            onChange={(e) => setRole(e.target.value)}
                                            className="input-style w-full px-5 py-3.5 appearance-none cursor-pointer"
                                        >
                                            <option value="student">Student</option>
                                            <option value="faculty">Faculty Member</option>
                                            <option value="alumni">Alumni / Mentor</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <Shield size={16} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="text-[11px] font-black text-primary-600 mb-1.5 block uppercase tracking-widest pl-1">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-style w-full px-5 py-3.5"
                                placeholder="you@hicas.ac.in"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-black text-primary-600 mb-1.5 block uppercase tracking-widest pl-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-style w-full px-5 py-3.5"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                        </div>

                        {error && (
                            <p className="text-rose-500 text-xs mt-2 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                                ⚠️ {error}
                            </p>
                        )}

                        {success && (
                            <div className="text-emerald-500 text-xs mt-2 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 flex items-start gap-2">
                                <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
                                <span>{success}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary-600 hover:bg-primary-500 text-white font-black py-4 rounded-2xl mt-6 shadow-2xl shadow-primary-600/30 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? (
                                <><Loader2 size={22} className="animate-spin" /> Processing...</>
                            ) : (
                                isLogin ? <><LogIn size={22} /> Login</> : <><UserPlus size={22} /> Sign Up</>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

function cn(...inputs) {
    return inputs.filter(Boolean).join(' ')
}
