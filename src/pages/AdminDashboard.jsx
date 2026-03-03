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
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-600/20 rounded-xl flex items-center justify-center text-primary-500">
                        <ShieldCheck size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Admin Panel</h2>
                        <p className="text-slate-400 text-sm">Moderate everything from one place</p>
                    </div>
                </div>
                <button
                    onClick={loadAll}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-slate-700"
                >
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                            activeTab === tab.id
                                ? "bg-primary-600 text-white shadow-lg"
                                : "text-slate-400 hover:bg-slate-800 hover:text-white"
                        )}
                    >
                        <tab.icon size={16} /> {tab.label}
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
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard label="Total Users" value={stats.totalUsers} color="primary" icon={Users} />
                                <StatCard label="Total Posts" value={stats.totalPosts} color="emerald" icon={FileText} />
                                <StatCard label="Flagged Content" value={stats.flaggedContent} color="rose" icon={ShieldCheck} />
                                <StatCard label="Communities" value={stats.communities} color="purple" icon={MessageSquare} />
                            </div>

                            <div className="glass-card bg-slate-900 border-slate-800 p-6">
                                <h3 className="text-lg font-bold text-white mb-4">Recent Moderation Activity</h3>
                                {logs.slice(0, 5).map(log => (
                                    <div key={log.id} className="flex items-center justify-between py-3 border-b border-slate-800/50 last:border-0">
                                        <div className="flex items-center gap-3">
                                            {log.is_flagged ? <XCircle size={16} className="text-rose-500" /> : <CheckCircle size={16} className="text-emerald-500" />}
                                            <p className="text-sm text-white line-clamp-1 max-w-md">{log.content_body}</p>
                                        </div>
                                        <span className={cn(
                                            "px-2 py-1 rounded text-[10px] font-bold uppercase",
                                            log.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                                        )}>
                                            {log.status}
                                        </span>
                                    </div>
                                ))}
                                {logs.length === 0 && <p className="text-slate-500 text-sm text-center py-8">No moderation activity yet</p>}
                            </div>
                        </div>
                    )}

                    {/* MODERATION TAB */}
                    {activeTab === 'moderation' && (
                        <div className="glass-card overflow-hidden bg-slate-900 border-slate-800">
                            <table className="w-full text-left">
                                <thead className="bg-slate-800/50 border-b border-slate-800">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Content</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Type</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Toxicity</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Time</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-800/30 transition-all">
                                            <td className="px-6 py-4">
                                                <p className="text-white text-sm line-clamp-1 max-w-xs">{log.content_body}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">{log.content_type}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={cn("h-full", log.toxicity_score > 0.6 ? "bg-rose-500" : "bg-emerald-500")}
                                                            style={{ width: `${(log.toxicity_score || 0) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-mono text-slate-400">{((log.toxicity_score || 0) * 100).toFixed(0)}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={log.status} />
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-500">
                                                {new Date(log.moderated_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => updateLogStatus(log.id, log.content_type, log.content_id, 'approved')}
                                                        className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                                                        title="Approve"
                                                    >
                                                        <CheckCircle size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => updateLogStatus(log.id, log.content_type, log.content_id, 'rejected')}
                                                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                                        title="Reject"
                                                    >
                                                        <XCircle size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {logs.length === 0 && <div className="p-12 text-center text-slate-500">No moderation logs found.</div>}
                        </div>
                    )}

                    {/* POSTS TAB */}
                    {activeTab === 'posts' && (
                        <div className="glass-card overflow-hidden bg-slate-900 border-slate-800">
                            <table className="w-full text-left">
                                <thead className="bg-slate-800/50 border-b border-slate-800">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Author</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Content</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Date</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {posts.map(post => (
                                        <tr key={post.id} className="hover:bg-slate-800/30 transition-all">
                                            <td className="px-6 py-4 text-sm text-white font-medium">{post.profiles?.full_name || 'Unknown'}</td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-slate-300 line-clamp-1 max-w-xs">{post.content}</p>
                                                {post.image_url && <span className="text-[10px] text-primary-400">📷 Has image</span>}
                                            </td>
                                            <td className="px-6 py-4"><StatusBadge status={post.status} /></td>
                                            <td className="px-6 py-4 text-xs text-slate-500">{new Date(post.created_at).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => updatePostStatus(post.id, 'approved')} className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg" title="Approve">
                                                        <CheckCircle size={16} />
                                                    </button>
                                                    <button onClick={() => updatePostStatus(post.id, 'rejected')} className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg" title="Reject">
                                                        <XCircle size={16} />
                                                    </button>
                                                    <button onClick={() => deletePost(post.id)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg" title="Delete">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {posts.length === 0 && <div className="p-12 text-center text-slate-500">No posts found.</div>}
                        </div>
                    )}

                    {/* USERS TAB */}
                    {activeTab === 'users' && (
                        <div className="glass-card overflow-hidden bg-slate-900 border-slate-800">
                            <table className="w-full text-left">
                                <thead className="bg-slate-800/50 border-b border-slate-800">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Name</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Role</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Joined</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-right">Change Role</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {users.map(u => (
                                        <tr key={u.id} className="hover:bg-slate-800/30 transition-all">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-bold text-sm overflow-hidden">
                                                        {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : u.full_name?.charAt(0)}
                                                    </div>
                                                    <span className="text-sm text-white font-medium">{u.full_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "px-2 py-1 rounded text-[10px] font-bold uppercase",
                                                    u.role === 'admin' ? 'bg-primary-500/10 text-primary-500' :
                                                        u.role === 'faculty' ? 'bg-amber-500/10 text-amber-500' :
                                                            'bg-slate-500/10 text-slate-400'
                                                )}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-right">
                                                <select
                                                    value={u.role}
                                                    onChange={(e) => updateUserRole(u.id, e.target.value)}
                                                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
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
                            {users.length === 0 && <div className="p-12 text-center text-slate-500">No users found.</div>}
                        </div>
                    )}

                    {/* COMMUNITIES TAB */}
                    {activeTab === 'communities' && (
                        <div className="glass-card overflow-hidden bg-slate-900 border-slate-800">
                            <table className="w-full text-left">
                                <thead className="bg-slate-800/50 border-b border-slate-800">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Name</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Creator</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Members</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Created</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {communities.map(c => (
                                        <tr key={c.id} className="hover:bg-slate-800/30 transition-all">
                                            <td className="px-6 py-4 text-sm text-white font-medium">{c.name}</td>
                                            <td className="px-6 py-4 text-sm text-slate-400">{c.profiles?.full_name}</td>
                                            <td className="px-6 py-4 text-sm text-slate-400">{c.community_members?.[0]?.count || 0}</td>
                                            <td className="px-6 py-4 text-xs text-slate-500">{new Date(c.created_at).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => deleteCommunity(c.id)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg" title="Delete">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {communities.length === 0 && <div className="p-12 text-center text-slate-500">No communities found.</div>}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

function StatCard({ label, value, color, icon: Icon }) {
    const colorMap = {
        primary: 'bg-primary-500/10 text-primary-500 border-primary-500/20',
        emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        rose: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    }

    return (
        <div className={`glass-card p-6 bg-slate-900 border-slate-800 space-y-2`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
                <Icon size={20} />
            </div>
            <p className="text-3xl font-bold text-white">{value}</p>
            <p className="text-xs font-bold text-slate-500 uppercase">{label}</p>
        </div>
    )
}

function StatusBadge({ status }) {
    const styles = {
        approved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        rejected: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    }
    return (
        <span className={cn("px-3 py-1 rounded-full text-xs font-bold border", styles[status] || styles.pending)}>
            {status || 'pending'}
        </span>
    )
}
