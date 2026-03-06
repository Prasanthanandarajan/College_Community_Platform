import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Users, Plus, UserPlus, UserMinus, Loader2, Search } from 'lucide-react'
import { moderateContent } from '../utils/moderation'

export default function Communities() {
    const { user } = useAuth()
    const [communities, setCommunities] = useState([])
    const [myMemberships, setMyMemberships] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [search, setSearch] = useState('')

    const [name, setName] = useState('')
    const [description, setDescription] = useState('')

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
            const contentToModerate = `${name} ${description}`
            const result = await moderateContent(contentToModerate, 'community', user.id)
            if (result.flagged) {
                alert('🚫 Community creation blocked by AI. The name or description contains inappropriate content.')
                setLoading(false)
                return
            }

            const { data, error } = await supabase.from('communities').insert({
                name,
                description,
                creator_id: user.id
            }).select().single()

            if (error) throw error

            // Auto-join the community you created
            await supabase.from('community_members').insert({
                community_id: data.id,
                user_id: user.id
            })

            setShowModal(false)
            setName(''); setDescription('')
        } catch (err) {
            alert(err.message)
        } finally {
            setLoading(false)
        }
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
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white">Communities</h2>
                    <p className="text-slate-400">Join groups and connect with peers</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary-500/20"
                >
                    <Plus size={20} />
                    Create Community
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search communities..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-20">
                    <Loader2 className="text-primary-500 animate-spin" size={48} />
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((community) => {
                        const memberCount = community.community_members?.[0]?.count || 0
                        const joined = isMember(community.id)

                        return (
                            <div key={community.id} className="glass-card bg-slate-900 border-slate-800 hover:border-primary-500/50 transition-all overflow-hidden group">
                                <div className="h-24 bg-gradient-to-br from-primary-900/60 to-purple-900/40 relative flex items-center justify-center">
                                    <Users size={40} className="text-primary-500/30" />
                                </div>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-white group-hover:text-primary-400 transition-colors">{community.name}</h3>
                                        <p className="text-slate-400 text-sm mt-1 line-clamp-2">{community.description}</p>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <Users size={16} />
                                            <span>{memberCount} members</span>
                                        </div>

                                        {joined ? (
                                            <button
                                                onClick={() => handleLeave(community.id)}
                                                className="flex items-center gap-1 text-sm font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 px-4 py-2 rounded-lg transition-all"
                                            >
                                                <UserMinus size={16} /> Leave
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleJoin(community.id)}
                                                className="flex items-center gap-1 text-sm font-bold text-primary-400 hover:text-primary-300 bg-primary-500/10 px-4 py-2 rounded-lg transition-all"
                                            >
                                                <UserPlus size={16} /> Join
                                            </button>
                                        )}
                                    </div>
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
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="glass-card bg-slate-900 border-slate-800 w-full max-w-lg p-8">
                        <h3 className="text-2xl font-bold text-white mb-6">Create New Community</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Community Name</label>
                                <input
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all border"
                                    placeholder="e.g. Computer Science Club"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all border h-32 resize-none"
                                    placeholder="What is this community about?"
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl transition-all border border-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary-500/20 transition-all"
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
