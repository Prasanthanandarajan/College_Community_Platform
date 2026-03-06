import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Users, Plus, UserPlus, UserMinus, Loader2, Search, Trash2, X } from 'lucide-react'
import { moderateContent } from '../utils/moderation'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs) {
    return twMerge(clsx(inputs))
}

export default function Communities() {
    const { user, profile, isAdmin } = useAuth()
    const [communities, setCommunities] = useState([])
    const [myMemberships, setMyMemberships] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [search, setSearch] = useState('')

    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [department, setDepartment] = useState('')

    useEffect(() => {
        fetchCommunities()
        fetchMyMemberships()

        const channel = supabase
            .channel('communities-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'communities' }, () => fetchCommunities())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'community_members' }, () => {
                fetchCommunities()
                fetchMyMemberships()
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    const fetchCommunities = async () => {
        const { data, error } = await supabase
            .from('communities')
            .select('*, profiles(full_name), community_members(count)')
            .order('created_at', { ascending: false })

        if (error) console.error(error)
        else setCommunities(data)
        setLoading(false)
    }

    const fetchMyMemberships = async () => {
        const { data } = await supabase
            .from('community_members')
            .select('community_id')
            .eq('user_id', user.id)

        if (data) setMyMemberships(data.map(m => m.community_id))
    }

    const handleCreate = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Moderate name and description
            const contentToModerate = `${name} ${description} `
            const result = await moderateContent(contentToModerate, 'community', user.id)
            if (result.flagged) {
                alert('🚫 Community creation blocked by AI. The name or description contains inappropriate content.')
                setLoading(false)
                return
            }

            const { data, error } = await supabase.from('communities').insert({
                name,
                description,
                department,
                creator_id: user.id
            }).select().single()

            if (error) throw error

            // Auto-join the community you created
            await supabase.from('community_members').insert({
                community_id: data.id,
                user_id: user.id
            })

            setShowModal(false)
            setName(''); setDescription(''); setDepartment('')
        } catch (err) {
            alert(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this community?')) return
        const { error } = await supabase.from('communities').delete().eq('id', id)
        if (error) alert('Failed to delete community: ' + error.message)
        else fetchCommunities()
    }

    const handleJoin = async (communityId) => {
        const { error } = await supabase.from('community_members').insert({
            community_id: communityId,
            user_id: user.id
        })
        if (error) alert(error.message)
    }

    const handleLeave = async (communityId) => {
        const { error } = await supabase
            .from('community_members')
            .delete()
            .eq('community_id', communityId)
            .eq('user_id', user.id)
        if (error) alert(error.message)
    }

    const isMember = (communityId) => myMemberships.includes(communityId)

    const filtered = communities.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-10 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h2 className="text-3xl lg:text-4xl font-extrabold text-[var(--foreground)] tracking-tight">Communities</h2>
                    <p className="text-[var(--text-muted)] mt-1 font-medium italic">Join groups and connect with peers</p>
                </div>
                {(profile?.role === 'faculty' || profile?.role === 'student' || isAdmin) && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-primary-600 hover:bg-primary-500 text-white px-8 py-4 rounded-2xl font-black transition-all shadow-2xl shadow-primary-600/30 active:scale-[0.98]"
                    >
                        <Plus size={20} className="stroke-[3]" />
                        <span>Create Community</span>
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="relative group animate-fade-in">
                <Search size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-primary-500 transition-colors" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by community name or focus..."
                    className="input-style w-full pl-14 pr-6 py-4.5 text-lg shadow-sm"
                />
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-20">
                    <Loader2 className="text-primary-500 animate-spin" size={48} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                    {filtered.map((community) => {
                        const memberCount = community.community_members?.[0]?.count || 0
                        const joined = isMember(community.id)

                        return (
                            <div key={community.id} className="glass-card bg-[var(--card-bg)] border-[var(--card-border)] hover:border-primary-500 transition-all overflow-hidden group flex flex-col">
                                <div className="h-32 bg-gradient-to-br from-primary-600/10 to-primary-900/30 relative flex items-center justify-center overflow-hidden">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05),transparent)]" />
                                    <Users size={48} className="text-primary-500 opacity-20 group-hover:scale-110 transition-transform duration-500" />
                                    {community.department && (
                                        <div className="absolute top-4 right-4">
                                            <span className="text-[10px] bg-white/10 backdrop-blur-md text-white px-3 py-1.5 rounded-lg font-black uppercase tracking-tighter border border-white/10">
                                                {community.department}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-6 space-y-5 flex-1 flex flex-col">
                                    <div className="flex-1">
                                        <h3 className="text-xl lg:text-2xl font-black text-[var(--foreground)] group-hover:text-primary-600 transition-colors line-clamp-1">{community.name}</h3>
                                        <p className="text-[var(--text-muted)] text-sm mt-2 line-clamp-3 leading-relaxed font-medium">{community.description}</p>
                                    </div>

                                    <div className="flex items-center justify-between pt-5 border-t border-[var(--card-border)] mt-auto">
                                        <div className="flex items-center gap-2 text-[var(--text-muted)] font-black text-xs uppercase tracking-widest">
                                            <Users size={16} className="text-primary-500" />
                                            <span>{memberCount} members</span>
                                        </div>

                                        {joined ? (
                                            <button
                                                onClick={() => handleLeave(community.id)}
                                                className="flex items-center gap-2 text-xs font-black text-rose-500 hover:bg-rose-500/10 px-4 py-2.5 rounded-xl transition-all border border-rose-500/10 uppercase tracking-widest"
                                            >
                                                <UserMinus size={16} /> <span>Leave</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleJoin(community.id)}
                                                className="flex items-center gap-2 text-xs font-black text-primary-600 bg-primary-500/10 hover:bg-primary-600 hover:text-white px-4 py-2.5 rounded-xl transition-all border border-primary-500/10 uppercase tracking-widest"
                                            >
                                                <UserPlus size={16} /> <span>Join Group</span>
                                            </button>
                                        )}
                                    </div>

                                    {(isAdmin || community.creator_id === user.id) && (
                                        <div className="pt-2 flex justify-end">
                                            <button
                                                onClick={() => handleDelete(community.id)}
                                                className="p-2.5 bg-rose-500/5 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl transition-all border border-rose-500/10 group/del"
                                                title="Delete Community"
                                            >
                                                <Trash2 size={18} className="group-hover/del:scale-110 transition-transform" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {filtered.length === 0 && !loading && (
                <div className="text-center p-20 glass-card bg-slate-900/50 border-dashed border-slate-800">
                    <Users size={48} className="mx-auto text-slate-600 mb-4" />
                    <p className="text-slate-500">No communities yet. Create the first one!</p>
                </div>
            )}

            {/* Create Community Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 lg:p-6 animate-fade-in">
                    <div className="glass-card bg-[var(--card-bg)] border-[var(--card-border)] w-full max-w-xl p-6 lg:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-2xl lg:text-3xl font-black text-[var(--foreground)] tracking-tight">Host New Community</h3>
                                <p className="text-[var(--text-muted)] text-sm font-medium mt-1">Found a new group for your peers</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-primary-600 uppercase tracking-widest pl-1">Name of Community</label>
                                <input
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="input-style w-full px-5 py-4"
                                    placeholder="e.g. Computer Science Club"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-primary-600 uppercase tracking-widest pl-1">Department / Domain</label>
                                <input
                                    value={department}
                                    onChange={(e) => setDepartment(e.target.value)}
                                    className="input-style w-full px-5 py-4"
                                    placeholder="e.g. Computer Science"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-primary-600 uppercase tracking-widest pl-1">Mission / Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="input-style w-full px-5 py-4 h-32 resize-none"
                                    placeholder="What is the purpose of this community?"
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 bg-[var(--input-bg)] hover:bg-slate-200 dark:hover:bg-slate-800 text-[var(--foreground)] font-bold py-4 rounded-2xl transition-all border border-[var(--input-border)]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-2 bg-primary-600 hover:bg-primary-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-primary-600/30 transition-all active:scale-[0.98]"
                                >
                                    Create Community
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
