import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CheckCircle, XCircle, ShieldCheck, Users, FileText, MessageSquare, Activity, RefreshCw, Loader2, Trash2, Eye } from 'lucide-react'

function cn(...inputs) {
    return inputs.filter(Boolean).join(' ')
}

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('overview')
    const [logs, setLogs] = useState([])
    const [users, setUsers] = useState([])
    const [posts, setPosts] = useState([])
    const [communities, setCommunities] = useState([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ totalUsers: 0, totalPosts: 0, flaggedContent: 0, communities: 0 })

    useEffect(() => {
        loadAll()
    }, [])

    const loadAll = async () => {
        setLoading(true)
        await Promise.all([fetchLogs(), fetchUsers(), fetchPosts(), fetchCommunities()])
        setLoading(false)
    }

    const fetchLogs = async () => {
        const { data } = await supabase
            .from('moderation_logs')
            .select('*')
            .order('moderated_at', { ascending: false })
        if (data) {
            setLogs(data)
            setStats(s => ({ ...s, flaggedContent: data.filter(l => l.is_flagged).length }))
        }
    }

    const fetchUsers = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })
        if (data) {
            setUsers(data)
            setStats(s => ({ ...s, totalUsers: data.length }))
        }
    }

    const fetchPosts = async () => {
        const { data } = await supabase
            .from('posts')
            .select('*, profiles(full_name)')
            .order('created_at', { ascending: false })
        if (data) {
            setPosts(data)
            setStats(s => ({ ...s, totalPosts: data.length }))
        }
    }

    const fetchCommunities = async () => {
        const { data } = await supabase
            .from('communities')
            .select('*, profiles(full_name), community_members(count)')
            .order('created_at', { ascending: false })
        if (data) {
            setCommunities(data)
            setStats(s => ({ ...s, communities: data.length }))
        }
    }

    const updatePostStatus = async (postId, status) => {
        await supabase.from('posts').update({ status }).eq('id', postId)
        fetchPosts()
    }

    const updateLogStatus = async (logId, contentType, contentId, status) => {
        const table = contentType === 'post' ? 'posts' : contentType === 'comment' ? 'comments' : 'messages'
        await supabase.from(table).update({ status }).eq('id', contentId)
        await supabase.from('moderation_logs').update({ status }).eq('id', logId)
        fetchLogs()
        fetchPosts()
    }

    const deletePost = async (postId) => {
        if (!confirm('Delete this post permanently?')) return
        await supabase.from('posts').delete().eq('id', postId)
        fetchPosts()
    }

    const deleteCommunity = async (communityId) => {
        if (!confirm('Delete this community permanently?')) return
        await supabase.from('communities').delete().eq('id', communityId)
        fetchCommunities()
    }

    const updateUserRole = async (userId, newRole) => {
        await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
        fetchUsers()
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Activity },
        { id: 'moderation', label: 'AI Moderation', icon: ShieldCheck },
        { id: 'posts', label: 'All Posts', icon: FileText },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'communities', label: 'Communities', icon: MessageSquare },
    ]

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-fade-in">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-primary-600/10 rounded-2xl flex items-center justify-center text-primary-500 border border-primary-500/20 shadow-xl shadow-primary-500/5">
                        <ShieldCheck size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl lg:text-4xl font-black text-[var(--foreground)] tracking-tight">Command Center</h2>
                        <p className="text-[var(--text-muted)] text-sm font-medium italic mt-1 uppercase tracking-widest opacity-60">System Oversight & Moderation</p>
                    </div>
                </div>
                <button
                    onClick={loadAll}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-[var(--input-bg)] hover:bg-[var(--card-border)] text-[var(--foreground)] rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-[var(--card-border)] shadow-sm hover:scale-105 active:scale-95 group w-full md:w-auto"
                >
                    <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                    <span>Synchronize Data</span>
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 bg-[var(--input-bg)] p-2 rounded-[2rem] border border-[var(--card-border)] shadow-inner overflow-x-auto no-scrollbar animate-fade-in">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center gap-3 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap",
                            activeTab === tab.id
                                ? "bg-[var(--foreground)] text-[var(--card-bg)] shadow-xl scale-[1.02]"
                                : "text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-bg)]"
                        )}
                    >
                        <tab.icon size={16} className={cn("transition-transform", activeTab === tab.id ? "scale-110" : "opacity-40")} />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-20">
                    <Loader2 className="text-primary-500 animate-spin" size={48} />
                </div>
            ) : (
                <>
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="space-y-10 animate-fade-in-up">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                                <StatCard label="Total Users" value={stats.totalUsers} color="primary" icon={Users} />
                                <StatCard label="Active Posts" value={stats.totalPosts} color="emerald" icon={FileText} />
                                <StatCard label="Flagged Events" value={stats.flaggedContent} color="rose" icon={ShieldCheck} />
                                <StatCard label="Nexus Nodes" value={stats.communities} color="purple" icon={MessageSquare} />
                            </div>

                            <div className="glass-card bg-[var(--card-bg)] border-[var(--card-border)] p-8 lg:p-12 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-16 opacity-[0.02] group-hover:scale-110 transition-transform pointer-events-none">
                                    <Activity size={240} />
                                </div>
                                <h3 className="text-2xl font-black text-[var(--foreground)] mb-8 tracking-tight flex items-center gap-3">
                                    <Activity className="text-primary-500" />
                                    <span>Real-time Oversight Stream</span>
                                </h3>
                                <div className="space-y-4">
                                    {logs.slice(0, 5).map(log => (
                                        <div key={log.id} className="flex items-center justify-between p-5 rounded-2xl bg-[var(--input-bg)] border border-[var(--card-border)] hover:border-primary-500/30 transition-all group/item">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover/item:scale-110",
                                                    log.is_flagged ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
                                                )}>
                                                    {log.is_flagged ? <XCircle size={20} /> : <CheckCircle size={20} />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-[var(--foreground)] line-clamp-1 max-w-sm">{log.content_body}</p>
                                                    <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest mt-0.5">{log.content_type} • {new Date(log.moderated_at).toLocaleTimeString()}</p>
                                                </div>
                                            </div>
                                            <span className={cn(
                                                "px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                                log.status === 'approved' ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/5 text-rose-500 border-rose-500/20'
                                            )}>
                                                {log.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                {logs.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] opacity-50">
                                        <RefreshCw size={48} className="animate-spin-slow mb-4" />
                                        <p className="text-xs font-black uppercase tracking-[0.2em]">Awaiting Telemetry...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* MODERATION TAB */}
                    {activeTab === 'moderation' && (
                        <div className="glass-card bg-[var(--card-bg)] border-[var(--card-border)] overflow-hidden shadow-2xl animate-fade-in-up">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-[var(--input-bg)]/50 border-b border-[var(--card-border)]">
                                            <th className="px-8 py-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Intercepted Content</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Vitals</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Toxicity Scan</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest text-right">Directives</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--card-border)]/50">
                                        {logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-primary-500/5 transition-all group">
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col gap-1.5">
                                                        <p className="text-[var(--foreground)] text-sm font-bold line-clamp-1 max-w-md group-hover:text-primary-600 transition-colors">{log.content_body}</p>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[9px] font-black uppercase tracking-widest bg-[var(--input-bg)] text-[var(--text-muted)] px-3 py-1 rounded-lg border border-[var(--card-border)]">{log.content_type}</span>
                                                            <span className="text-[9px] text-[var(--text-muted)] italic">{new Date(log.moderated_at).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <StatusBadge status={log.status} />
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-24 h-2 bg-[var(--input-bg)] rounded-full overflow-hidden border border-[var(--card-border)]">
                                                            <div
                                                                className={cn("h-full transition-all duration-1000", log.toxicity_score > 0.6 ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" : "bg-emerald-500")}
                                                                style={{ width: `${(log.toxicity_score || 0) * 100}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[11px] font-black text-[var(--text-muted)] tracking-tighter">{((log.toxicity_score || 0) * 100).toFixed(0)}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex justify-end gap-3">
                                                        <button
                                                            onClick={() => updateLogStatus(log.id, log.content_type, log.content_id, 'approved')}
                                                            className="w-10 h-10 flex items-center justify-center text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all border border-transparent hover:border-emerald-500/30"
                                                            title="Approve"
                                                        >
                                                            <CheckCircle size={20} />
                                                        </button>
                                                        <button
                                                            onClick={() => updateLogStatus(log.id, log.content_type, log.content_id, 'rejected')}
                                                            className="w-10 h-10 flex items-center justify-center text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/30"
                                                            title="Reject"
                                                        >
                                                            <XCircle size={20} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {logs.length === 0 && <div className="p-20 text-center flex flex-col items-center gap-4 opacity-30">
                                <ShieldCheck size={64} className="stroke-[1]" />
                                <p className="font-black text-[10px] uppercase tracking-widest">No Security Violations Detected</p>
                            </div>}
                        </div>
                    )}

                    {/* POSTS TAB */}
                    {activeTab === 'posts' && (
                        <div className="glass-card bg-[var(--card-bg)] border-[var(--card-border)] overflow-hidden shadow-2xl animate-fade-in-up">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-[var(--input-bg)]/50 border-b border-[var(--card-border)]">
                                            <th className="px-8 py-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Nexus Content</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Source</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">State</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest text-right">Directives</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--card-border)]/50">
                                        {posts.map(post => (
                                            <tr key={post.id} className="hover:bg-primary-500/5 transition-all group">
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col gap-1.5">
                                                        <p className="text-[var(--foreground)] text-sm font-bold line-clamp-1 max-w-md group-hover:text-primary-600 transition-colors">{post.content}</p>
                                                        {post.image_url && <span className="text-[9px] text-primary-500 font-black uppercase tracking-widest flex items-center gap-1"><FileText size={10} /> Media Attached</span>}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-[var(--foreground)]">{post.profiles?.full_name || 'Unknown Entity'}</span>
                                                        <span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">{new Date(post.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6"><StatusBadge status={post.status} /></td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => updatePostStatus(post.id, 'approved')} className="w-9 h-9 flex items-center justify-center text-emerald-500 hover:bg-emerald-500/10 rounded-xl" title="Approve"><CheckCircle size={18} /></button>
                                                        <button onClick={() => updatePostStatus(post.id, 'rejected')} className="w-9 h-9 flex items-center justify-center text-amber-500 hover:bg-amber-500/10 rounded-xl" title="Revoke"><XCircle size={18} /></button>
                                                        <button onClick={() => deletePost(post.id)} className="w-9 h-9 flex items-center justify-center text-rose-500 hover:bg-rose-500/10 rounded-xl" title="Purge"><Trash2 size={18} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* USERS TAB */}
                    {activeTab === 'users' && (
                        <div className="glass-card bg-[var(--card-bg)] border-[var(--card-border)] overflow-hidden shadow-2xl animate-fade-in-up">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-[var(--input-bg)]/50 border-b border-[var(--card-border)]">
                                            <th className="px-8 py-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Identity</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Clearance</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Enrolled</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest text-right">Override Clearance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--card-border)]/50">
                                        {users.map(u => (
                                            <tr key={u.id} className="hover:bg-primary-500/5 transition-all">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-[var(--input-bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text-muted)] font-black text-xs overflow-hidden shadow-sm">
                                                            {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : u.full_name?.charAt(0)}
                                                        </div>
                                                        <span className="text-sm text-[var(--foreground)] font-bold">{u.full_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={cn(
                                                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                                        u.role === 'admin' ? 'bg-primary-500/5 text-primary-500 border-primary-500/20' :
                                                            u.role === 'faculty' ? 'bg-amber-500/5 text-amber-500 border-amber-500/20' :
                                                                'bg-[var(--input-bg)] text-[var(--text-muted)] border-[var(--card-border)]'
                                                    )}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-xs text-[var(--text-muted)] font-medium font-mono">{new Date(u.created_at).toLocaleDateString()}</td>
                                                <td className="px-8 py-6 text-right">
                                                    <select
                                                        value={u.role}
                                                        onChange={(e) => updateUserRole(u.id, e.target.value)}
                                                        className="bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--foreground)] focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all cursor-pointer"
                                                    >
                                                        <option value="student">Student</option>
                                                        <option value="faculty">Faculty</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* COMMUNITIES TAB */}
                    {activeTab === 'communities' && (
                        <div className="glass-card bg-[var(--card-bg)] border-[var(--card-border)] overflow-hidden shadow-2xl animate-fade-in-up">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-[var(--input-bg)]/50 border-b border-[var(--card-border)]">
                                            <th className="px-8 py-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Neural Nexus</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Architect</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Population</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest text-right">System Directive</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--card-border)]/50">
                                        {communities.map(c => (
                                            <tr key={c.id} className="hover:bg-primary-500/5 transition-all">
                                                <td className="px-8 py-6 text-sm text-[var(--foreground)] font-bold">{c.name}</td>
                                                <td className="px-8 py-6 text-sm text-[var(--text-muted)] font-medium">{c.profiles?.full_name}</td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)]">
                                                        <Users size={14} className="text-primary-500" />
                                                        <span>{c.community_members?.[0]?.count || 0} Entities</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <button onClick={() => deleteCommunity(c.id)} className="w-10 h-10 flex items-center justify-center text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all" title="Purge Community">
                                                        <Trash2 size={20} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

function StatCard({ label, value, color, icon: Icon }) {
    const colorMap = {
        primary: 'bg-primary-500/10 text-primary-500 border-primary-500/20 shadow-primary-500/5',
        emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/5',
        rose: 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-rose-500/5',
        purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20 shadow-purple-500/5',
    }

    return (
        <div className="glass-card p-6 md:p-8 bg-[var(--card-bg)] border-[var(--card-border)] hover:border-primary-500/30 transition-all group overflow-hidden relative">
            <div className="flex justify-between items-start relative z-10">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg transition-transform group-hover:scale-110 duration-500 ${colorMap[color]}`}>
                    <Icon size={24} />
                </div>
                <div className="text-right">
                    <p className="text-4xl font-black text-[var(--foreground)] tracking-tighter drop-shadow-sm">{value}</p>
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mt-1">{label}</p>
                </div>
            </div>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-primary-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
        </div>
    )
}

function StatusBadge({ status }) {
    const styles = {
        approved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/5',
        rejected: 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-rose-500/5',
        pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-amber-500/5',
    }
    return (
        <span className={cn("px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm inline-flex items-center gap-2", styles[status] || styles.pending)}>
            <div className={cn("w-1.5 h-1.5 rounded-full",
                status === 'approved' ? 'bg-emerald-500 pulse-emerald' :
                    status === 'rejected' ? 'bg-rose-500' : 'bg-amber-500'
            )} />
            {status || 'pending'}
        </span>
    )
}
