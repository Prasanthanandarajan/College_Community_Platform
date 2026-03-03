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
            if (isLogin) {
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
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_50%_50%,rgba(14,165,233,0.1),transparent_50%)]">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <div className="inline-flex w-16 h-16 bg-primary-600 rounded-2xl items-center justify-center text-white mb-6 transform rotate-12">
                        <Shield size={32} />
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">CollegeCommunity</h2>
                    <p className="text-slate-400 mt-2">Connecting Minds, Moderated by AI</p>
                </div>

                <div className="glass-card p-8 bg-slate-900 border-slate-800 shadow-2xl">
                    <div className="flex p-1 bg-slate-800 rounded-xl mb-8">
                        <button
                            onClick={() => { setIsLogin(true); setError(null); setSuccess(null) }}
                            className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", isLogin ? "bg-primary-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => { setIsLogin(false); setError(null); setSuccess(null) }}
                            className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", !isLogin ? "bg-primary-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}
                        >
                            Sign Up
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Full Name</label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all border"
                                        placeholder="John Doe"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">I am a...</label>
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all border appearance-none"
                                    >
                                        <option value="student">Student</option>
                                        <option value="faculty">Faculty Member</option>
                                    </select>
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all border"
                                placeholder="you@gmail.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all border"
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
                            className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 rounded-xl mt-4 shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            {loading ? (
                                <><Loader2 size={20} className="animate-spin" /> Processing...</>
                            ) : (
                                isLogin ? <><LogIn size={20} /> Login</> : <><UserPlus size={20} /> Create Account</>
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
