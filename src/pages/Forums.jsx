import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Search, Send, Hash, User, ShieldAlert, ArrowLeft, MessageSquare, Loader2, Plus, Trash2, X } from 'lucide-react'
import { moderateContent } from '../utils/moderation'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs) {
    return twMerge(clsx(inputs))
}

// Departments will be fetched from database

export default function Forums() {
    const { user, profile, isAdmin } = useAuth()
    const [departments, setDepartments] = useState([])
    const [activeForum, setActiveForum] = useState(null)
    const [search, setSearch] = useState('')
    const [showAdminModal, setShowAdminModal] = useState(false)
    const [newDeptName, setNewDeptName] = useState('')
    const [newDeptTheme, setNewDeptTheme] = useState('blue')

    // Chat state
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [fetchingMessages, setFetchingMessages] = useState(false)
    const scrollRef = useRef()

    useEffect(() => {
        fetchDepartments()
    }, [])

    const fetchDepartments = async () => {
        const { data } = await supabase.from('forum_departments').select('*').order('name')
        if (data) setDepartments(data)
    }

    useEffect(() => {
        if (!activeForum) return

        fetchMessages()
        const channel = supabase
            .channel(`forum-${activeForum.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.forum-${activeForum.id}` },
                () => fetchMessages()
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [activeForum])

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const fetchMessages = async () => {
        setFetchingMessages(true)
        const { data } = await supabase
            .from('messages')
            .select('*, profiles(full_name, avatar_url)')
            .eq('room_id', `forum-${activeForum.id}`)
            .eq('status', 'approved')
            .order('created_at', { ascending: true })

        if (data) setMessages(data)
        setFetchingMessages(false)
    }

    const handleSend = async (e) => {
        e.preventDefault()
        if (!newMessage.trim() || loading) return

        setLoading(true)
        const content = newMessage
        setNewMessage('')

        try {
            const moderation = await moderateContent(content, 'message', user.id)
            if (moderation.flagged) {
                alert('🚫 Message blocked by AI — contains inappropriate content.')
                setLoading(false)
                return
            }
            await supabase.from('messages').insert({
                sender_id: user.id,
                content: content,
                room_id: `forum-${activeForum.id}`,
                status: 'approved'
            })
        } catch (error) {
            alert('Failed to send message')
        } finally {
            setLoading(false)
        }
    }

    const handleAddDept = async (e) => {
        e.preventDefault()
        const { error } = await supabase.from('forum_departments').insert({ name: newDeptName, color_theme: newDeptTheme })
        if (error) alert(error.message)
        else {
            setShowAdminModal(false)
            setNewDeptName('')
            fetchDepartments()
        }
    }

    const handleDeleteDept = async (id, e) => {
        e.stopPropagation()
        if (!window.confirm('Delete this department forum?')) return
        const { error } = await supabase.from('forum_departments').delete().eq('id', id)
        if (error) alert(error.message)
        else fetchDepartments()
    }

    const canAccess = (dept) => {
        if (isAdmin) return true
        if (profile?.role === 'alumni') return profile?.department === dept.name
        return profile?.department === dept.name
    }

    const getThemeColors = (theme) => {
        const themes = {
            blue: { color: 'from-blue-500/20 to-indigo-500/20', text: 'text-blue-400' },
            emerald: { color: 'from-emerald-500/20 to-teal-500/20', text: 'text-emerald-400' },
            orange: { color: 'from-orange-500/20 to-red-500/20', text: 'text-orange-400' },
            purple: { color: 'from-purple-500/20 to-fuchsia-500/20', text: 'text-purple-400' },
            pink: { color: 'from-pink-500/20 to-rose-500/20', text: 'text-pink-400' },
        }
        return themes[theme] || themes.blue
    }

    const filteredDepts = departments.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))

    // FORUM LIST VIEW
    if (!activeForum) {
        return (
            <div className="space-y-10 max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                        <h2 className="text-3xl lg:text-4xl font-extrabold text-[var(--foreground)] tracking-tight">Departmental Forums</h2>
                        <p className="text-[var(--text-muted)] mt-1 font-medium italic">Join discussions specific to your field of study</p>
                    </div>
                </div>

                <div className="relative group animate-fade-in">
                    <Search size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-primary-500 transition-colors" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by department name..."
                        className="input-style w-full pl-14 pr-6 py-4.5 text-lg shadow-sm"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                    {filteredDepts.map(dept => {
                        const theme = getThemeColors(dept.color_theme)
                        const allowed = canAccess(dept)
                        return (
                            <div
                                key={dept.id}
                                onClick={() => allowed ? setActiveForum(dept) : alert(`Access Denied. You must be in the ${dept.name} department to join this forum.`)}
                                className={cn(
                                    "glass-card bg-[var(--card-bg)] border-[var(--card-border)] hover:border-primary-500 transition-all cursor-pointer p-8 group relative overflow-hidden flex flex-col min-h-[220px]",
                                    !allowed && "opacity-50 saturate-0 hover:opacity-100 hover:saturate-100"
                                )}
                            >
                                <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:scale-110 transition-transform">
                                    <Hash size={120} />
                                </div>

                                <div className="flex justify-between items-start mb-6 z-10">
                                    <div className={cn("w-14 h-14 rounded-2xl bg-slate-900/50 flex items-center justify-center border border-slate-700/50 shadow-xl", theme.text)}>
                                        <MessageSquare size={28} />
                                    </div>
                                    {isAdmin && (
                                        <button onClick={(e) => handleDeleteDept(dept.id, e)} className="p-2.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-rose-500/10 hover:border-rose-500/30">
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>

                                <div className="z-10 flex-1">
                                    <h3 className="text-2xl font-black text-[var(--foreground)] group-hover:text-primary-600 transition-colors tracking-tight">{dept.name}</h3>
                                    <p className="text-[var(--text-muted)] text-sm mt-3 font-medium leading-relaxed">
                                        {allowed ? 'Community discussion and departmental updates.' : `Exclusive to identified ${dept.name} members.`}
                                    </p>
                                </div>

                                <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary-500 z-10">
                                    {allowed ? <span>Join Interaction Room</span> : <span className="text-rose-500 flex items-center gap-1"><ShieldAlert size={12} /> Restricted Access</span>}
                                </div>
                            </div>
                        )
                    })}
                    {isAdmin && (
                        <div
                            onClick={() => setShowAdminModal(true)}
                            className="glass-card border-2 border-dashed border-[var(--card-border)] hover:border-primary-500 transition-all cursor-pointer p-8 flex flex-col items-center justify-center gap-4 text-[var(--text-muted)] hover:text-primary-500 group min-h-[220px]"
                        >
                            <div className="w-16 h-16 rounded-full bg-primary-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Plus size={32} />
                            </div>
                            <span className="font-black uppercase tracking-widest text-sm">Deploy New Forum</span>
                        </div>
                    )}
                </div>

                {showAdminModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 lg:p-6 animate-fade-in">
                        <div className="glass-card bg-[var(--card-bg)] border-[var(--card-border)] w-full max-w-md p-8 lg:p-10 shadow-2xl">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-2xl font-black text-[var(--foreground)] tracking-tight">New Forum</h3>
                                    <p className="text-[var(--text-muted)] text-sm font-medium mt-1">Configure a new workspace</p>
                                </div>
                                <button onClick={() => setShowAdminModal(false)} className="p-2 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleAddDept} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-primary-600 uppercase tracking-widest pl-1">Department Identifier</label>
                                    <input required value={newDeptName} onChange={e => setNewDeptName(e.target.value)} className="input-style w-full px-5 py-4" placeholder="e.g. Computer Science" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-primary-600 uppercase tracking-widest pl-1">Aesthetic Sync</label>
                                    <select value={newDeptTheme} onChange={e => setNewDeptTheme(e.target.value)} className="input-style w-full px-5 py-4 appearance-none">
                                        <option value="blue">Sapphire Blue</option>
                                        <option value="emerald">Emerald Green</option>
                                        <option value="orange">Solar Orange</option>
                                        <option value="purple">Vibrant Purple</option>
                                        <option value="pink">Ruby Pink</option>
                                    </select>
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setShowAdminModal(false)} className="flex-1 bg-[var(--input-bg)] hover:bg-slate-800 text-[var(--foreground)] font-bold py-4 rounded-2xl border border-[var(--card-border)] transition-all">Discard</button>
                                    <button type="submit" className="flex-2 bg-primary-600 hover:bg-primary-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-primary-600/30 transition-all">Deploy Forum</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // CHAT VIEW
    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)] max-w-7xl mx-auto glass-card bg-[var(--card-bg)] border-[var(--card-border)] overflow-hidden shadow-2xl animate-fade-in-up">
            {/* Header */}
            <div className="p-4 lg:p-6 border-b border-[var(--card-border)] flex items-center justify-between bg-[var(--card-bg)] z-10 shadow-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-600/5 to-transparent pointer-events-none" />
                <div className="flex items-center gap-5 relative z-10">
                    <button
                        onClick={() => setActiveForum(null)}
                        className="w-12 h-12 rounded-[1.25rem] bg-[var(--input-bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text-muted)] hover:text-primary-600 hover:bg-primary-500/10 transition-all hover:scale-110 active:scale-95 shadow-sm"
                        title="Exit Forum"
                    >
                        <ArrowLeft size={24} className="stroke-[2.5]" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={cn("text-xs font-black uppercase tracking-[0.2em]", getThemeColors(activeForum.color_theme).text)}>
                                Departmental Live Forum
                            </span>
                        </div>
                        <h2 className="text-2xl font-black text-[var(--foreground)] flex items-center gap-2 tracking-tight">
                            <Hash size={24} className="text-primary-500" />
                            {activeForum.name}
                        </h2>
                    </div>
                </div>
                <div className="hidden sm:flex items-center gap-3 text-[10px] text-emerald-500 bg-emerald-500/5 px-4 py-2 rounded-2xl font-black uppercase tracking-[0.2em] border border-emerald-500/10 relative z-10">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                    Secure Active Moderation
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 space-y-10 scroll-smooth bg-[radial-gradient(circle_at_20%_20%,rgba(0,0,0,0.01),transparent)] flex flex-col">
                {fetchingMessages ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-[var(--text-muted)]">
                        <Loader2 className="animate-spin text-primary-500" size={48} />
                        <p className="text-xs font-black uppercase tracking-widest">Fetching Interactions...</p>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 flex flex-col justify-end space-y-10">
                            {messages.map((msg) => (
                                <div key={msg.id} className={cn(
                                    "flex gap-4 group animate-fade-in-up",
                                    msg.sender_id === user.id ? 'flex-row-reverse' : ''
                                )}>
                                    <div className="w-12 h-12 rounded-2xl bg-[var(--input-bg)] border border-[var(--card-border)] flex-shrink-0 flex items-center justify-center text-[var(--text-muted)] group-hover:border-primary-500/30 transition-all shadow-sm self-end overflow-hidden">
                                        {msg.profiles?.avatar_url ? <img src={msg.profiles.avatar_url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" /> : <div className="font-black text-xs">{msg.profiles?.full_name?.charAt(0) || <User size={24} />}</div>}
                                    </div>
                                    <div className={cn(
                                        "max-w-[85%] sm:max-w-[70%] space-y-1.5",
                                        msg.sender_id === user.id ? 'text-right' : ''
                                    )}>
                                        <div className={cn(
                                            "flex gap-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1",
                                            msg.sender_id === user.id ? 'flex-row-reverse px-2' : 'px-2'
                                        )}>
                                            <span>{msg.profiles?.full_name || 'Anonymous User'}</span>
                                            <span className="opacity-40 italic font-medium">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className={cn(
                                            "px-6 py-4 rounded-3xl text-sm font-medium leading-relaxed shadow-sm",
                                            msg.sender_id === user.id
                                                ? 'bg-primary-600 text-white rounded-tr-none shadow-primary-600/10'
                                                : 'bg-[var(--input-bg)] text-[var(--foreground)] rounded-tl-none border border-[var(--card-border)]'
                                        )}>
                                            {msg.content}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {messages.length === 0 && (
                            <div className="text-center py-24 px-10">
                                <div className="w-24 h-24 bg-[var(--input-bg)] rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 text-primary-500 border border-[var(--card-border)]">
                                    <MessageSquare size={40} className="opacity-40" />
                                </div>
                                <h4 className="text-xl font-black text-[var(--foreground)] tracking-tight">Departmental Dialogue</h4>
                                <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto mt-2 italic font-medium">Welcome to the {activeForum.name} community. Be the first to start a conversation below.</p>
                            </div>
                        )}
                        <div ref={scrollRef} className="pt-2" />
                    </>
                )}
            </div>

            {/* Input Overlay */}
            <div className="p-6 md:p-8 lg:p-10 border-t border-[var(--card-border)] bg-[var(--card-bg)] shadow-[0_-10px_30px_rgba(0,0,0,0.1)] z-10">
                <form onSubmit={handleSend} className="relative group">
                    <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary-500/20 to-transparent" />
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`Broadcast a thought to #${activeForum.name}...`}
                        className="w-full bg-[var(--input-bg)] border-[var(--input-border)] rounded-[2rem] px-8 py-5 pr-20 text-[var(--foreground)] font-medium focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all border shadow-inner text-lg"
                    />
                    <button
                        type="submit"
                        disabled={loading || !newMessage.trim()}
                        className="absolute right-2.5 top-2.5 bottom-2.5 bg-primary-600 hover:bg-primary-500 text-white w-14 rounded-[1.5rem] flex items-center justify-center transition-all disabled:opacity-50 shadow-lg shadow-primary-600/20 hover:scale-105 active:scale-95 group/send"
                    >
                        <Send size={22} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                </form>
                <div className="flex items-center justify-between mt-5 px-2">
                    <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-[0.2em] flex items-center gap-2 opacity-60">
                        <ShieldAlert size={14} className="text-rose-500" />
                        <span>Identity Protected & AI Scanned</span>
                    </p>
                    <div className="flex gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/20" />
                    </div>
                </div>
            </div>
        </div>
    )
}
