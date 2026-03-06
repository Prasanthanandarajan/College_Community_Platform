import React, { useState, useEffect, useRef } from 'react'
import { Plus, Send, Image as ImageIcon, MessageCircle, Heart, Share2, MoreVertical, Bell, X, Loader2, ShieldCheck } from 'lucide-react'
import { moderateContent } from '../utils/moderation'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs) {
    return twMerge(clsx(inputs))
}

export default function Feed() {
    const { user, profile } = useAuth()
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(false)
    const [posts, setPosts] = useState([])
    const [notices, setNotices] = useState([])
    const [message, setMessage] = useState(null)
    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState(null)
    const [likes, setLikes] = useState({})       // { postId: count }
    const [myLikes, setMyLikes] = useState({})    // { postId: true }
    const [comments, setComments] = useState({})  // { postId: [comments] }
    const [openComments, setOpenComments] = useState({}) // { postId: true }
    const [commentText, setCommentText] = useState({})   // { postId: text }
    const fileInputRef = useRef(null)

    useEffect(() => {
        fetchPosts()
        fetchNotices()

        const channel = supabase
            .channel('feed-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => fetchPosts())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => fetchAllLikes())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => fetchAllComments())
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    const fetchPosts = async () => {
        const { data } = await supabase
            .from('posts')
            .select('*, profiles(full_name, avatar_url, role)')
            .eq('status', 'approved')
            .order('created_at', { ascending: false })

        if (data) {
            setPosts(data)
            // Fetch likes and comments for these posts
            fetchAllLikes()
            fetchAllComments()
        }
    }

    const fetchAllLikes = async () => {
        const { data } = await supabase.from('likes').select('post_id, user_id')
        if (data) {
            const counts = {}
            const mine = {}
            data.forEach(l => {
                counts[l.post_id] = (counts[l.post_id] || 0) + 1
                if (l.user_id === user.id) mine[l.post_id] = true
            })
            setLikes(counts)
            setMyLikes(mine)
        }
    }

    const fetchAllComments = async () => {
        const { data } = await supabase
            .from('comments')
            .select('*, profiles(full_name, avatar_url)')
            .order('created_at', { ascending: true })
        if (data) {
            const grouped = {}
            data.forEach(c => {
                if (!grouped[c.post_id]) grouped[c.post_id] = []
                grouped[c.post_id].push(c)
            })
            setComments(grouped)
        }
    }

    const fetchNotices = async () => {
        const { data } = await supabase.from('events').select('*').order('event_date', { ascending: true }).limit(3)
        if (data) setNotices(data)
    }

    const handleLike = async (postId) => {
        if (myLikes[postId]) {
            await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id)
        } else {
            await supabase.from('likes').insert({ post_id: postId, user_id: user.id })
        }
    }

    const handleComment = async (postId) => {
        const text = commentText[postId]?.trim()
        if (!text) return

        try {
            // Moderate comment
            const result = await moderateContent(text, 'comment', user.id)
            if (result.flagged) {
                alert('🚫 Comment blocked by AI. It contains inappropriate content.')
                return
            }
        } catch (e) {
            // If moderation fails, allow comment (fail-open for comments)
        }

        await supabase.from('comments').insert({
            post_id: postId,
            user_id: user.id,
            content: text,
            status: 'approved'
        })
        setCommentText(prev => ({ ...prev, [postId]: '' }))
    }

    const handleImageSelect = (e) => {
        const file = e.target.files[0]
        if (!file) return
        if (file.size > 5 * 1024 * 1024) { setMessage({ type: 'error', text: 'Image must be less than 5MB' }); return }
        setImageFile(file)
        setImagePreview(URL.createObjectURL(file))
    }

    const uploadImage = async (file) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const { error } = await supabase.storage.from('post-images').upload(fileName, file)
        if (error) throw error
        const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(fileName)
        return publicUrl
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!content.trim() && !imageFile) return
        setLoading(true)
        setMessage(null)

        try {
            if (content.trim()) {
                const result = await moderateContent(content, 'post', user.id)
                console.log('Moderation result:', result)
                if (result.flagged) {
                    alert('🚫 Content flagged as inappropriate by AI. Post rejected.')
                    setLoading(false)
                    return
                }
            }

            let imageUrl = null
            if (imageFile) imageUrl = await uploadImage(imageFile)

            const { error } = await supabase.from('posts').insert({
                user_id: user.id,
                content: content || '📷 Shared an image',
                image_url: imageUrl,
                status: 'approved'
            })
            if (error) throw error

            setContent('')
            setImageFile(null)
            setImagePreview(null)
            setMessage({ type: 'success', text: '✅ Post published!' })
        } catch (error) {
            setMessage({ type: 'error', text: error.message })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 lg:items-start">
            <div className="lg:col-span-2 space-y-6">
                {/* Create Post */}
                <div className="glass-card p-4 lg:p-6 bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
                    <form onSubmit={handleSubmit}>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-slate-800 flex-shrink-0 flex items-center justify-center text-slate-500 overflow-hidden border border-slate-700">
                                {profile?.avatar_url ? <img src={profile.avatar_url} alt="Me" className="w-full h-full object-cover" /> : <Plus size={20} />}
                            </div>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="What's happening on campus?"
                                className="w-full bg-slate-800/20 border border-slate-700/30 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all resize-none h-32 text-sm lg:text-base"
                            />
                        </div>

                        {imagePreview && (
                            <div className="relative mt-4 ml-0 lg:ml-16">
                                <div className="rounded-2xl overflow-hidden border border-slate-700 aspect-video lg:aspect-auto">
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover max-h-64" />
                                </div>
                                <button type="button" onClick={() => { setImageFile(null); setImagePreview(null) }} className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white p-2 rounded-full hover:bg-rose-500 transition-all shadow-lg">
                                    <X size={16} />
                                </button>
                            </div>
                        )}

                        {message && (
                            <div className={cn(
                                "mt-4 p-3 rounded-xl border flex items-center gap-2 text-sm ml-0 lg:ml-16 animate-fade-in",
                                message.type === 'error' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            )}>
                                <div className={cn("w-1.5 h-1.5 rounded-full", message.type === 'error' ? "bg-rose-500" : "bg-emerald-500")}></div>
                                {message.text}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 ml-0 lg:ml-16">
                            <div className="flex gap-2 w-full sm:w-auto">
                                <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 sm:flex-none py-2.5 px-4 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-700/50">
                                    <ImageIcon size={18} className="text-primary-500" />
                                    <span className="text-sm font-semibold">Photo</span>
                                </button>
                            </div>
                            <button disabled={loading || (!content.trim() && !imageFile)} className="w-full sm:w-auto bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary-600/30">
                                {loading ? <><Loader2 size={18} className="animate-spin" /> Analyzing...</> : <>Post <Send size={18} /></>}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Posts */}
                <div className="space-y-6">
                    {posts.map((post) => (
                        <div key={post.id} className="glass-card p-5 lg:p-6 bg-slate-900 border-slate-800 hover:border-slate-700/50 transition-all shadow-sm">
                            {/* Post Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-1.5xl bg-slate-800 overflow-hidden border border-slate-700/50 flex items-center justify-center text-slate-500 font-bold">
                                        {post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : (post.profiles?.full_name?.charAt(0) || 'U')}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                            {post.profiles?.full_name}
                                            {post.profiles?.role === 'faculty' && <span className="bg-primary-600/20 text-primary-400 text-[9px] px-2 py-0.5 rounded-full border border-primary-500/20 font-black tracking-widest uppercase">Faculty</span>}
                                        </h4>
                                        <p className="text-[10px] text-slate-500 font-medium">{new Date(post.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                                <button className="p-2 text-slate-500 hover:text-white transition-colors">
                                    <MoreVertical size={16} />
                                </button>
                            </div>

                            {/* Post Content */}
                            <div className="text-slate-200 text-sm lg:text-[15px] leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</div>
                            {post.image_url && (
                                <div className="mb-4 rounded-2xl overflow-hidden border border-slate-800/50 bg-slate-800/30">
                                    <img src={post.image_url} alt="Post" className="w-full h-auto object-cover max-h-[500px]" />
                                </div>
                            )}

                            {/* Like & Comment Buttons */}
                            <div className="flex items-center gap-4 lg:gap-8 pt-4 border-t border-slate-800/40">
                                <button
                                    onClick={() => handleLike(post.id)}
                                    className={`flex items-center gap-2.5 text-xs font-bold transition-all py-1.5 ${myLikes[post.id] ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'}`}
                                >
                                    <Heart size={20} fill={myLikes[post.id] ? 'currentColor' : 'none'} className={cn("transition-transform", myLikes[post.id] && "scale-110")} />
                                    <span>{likes[post.id] || 0}</span>
                                </button>
                                <button
                                    onClick={() => setOpenComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                                    className="flex items-center gap-2.5 text-xs font-bold text-slate-400 hover:text-primary-500 transition-all py-1.5"
                                >
                                    <MessageCircle size={20} />
                                    <span>{(comments[post.id]?.length || 0)}</span>
                                </button>
                                <button className="flex items-center gap-2.5 text-xs font-bold text-slate-400 hover:text-primary-500 transition-all py-1.5 ml-auto">
                                    <Share2 size={18} />
                                </button>
                            </div>

                            {/* Comments Section */}
                            {openComments[post.id] && (
                                <div className="mt-4 pt-4 border-t border-slate-800/40 space-y-4 animate-fade-in">
                                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                        {(comments[post.id] || []).map(c => (
                                            <div key={c.id} className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 font-bold flex-shrink-0 overflow-hidden border border-slate-700/50">
                                                    {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : (c.profiles?.full_name?.charAt(0) || '?')}
                                                </div>
                                                <div className="bg-slate-800/40 rounded-2xl px-4 py-2.5 flex-1 border border-slate-700/30">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <p className="text-[11px] font-bold text-white">{c.profiles?.full_name}</p>
                                                        <span className="text-[9px] text-slate-500">{new Date(c.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-sm text-slate-300 leading-snug">{c.content}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add Comment */}
                                    <div className="flex items-center gap-2 bg-slate-800/30 p-2 rounded-2xl border border-slate-700/30">
                                        <input
                                            type="text"
                                            value={commentText[post.id] || ''}
                                            onChange={(e) => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                                            onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                                            placeholder="Write a community response..."
                                            className="flex-1 bg-transparent border-none px-3 py-2 text-sm text-white focus:outline-none placeholder:text-slate-600"
                                        />
                                        <button
                                            onClick={() => handleComment(post.id)}
                                            className="p-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition-all shadow-lg shadow-primary-600/20"
                                        >
                                            <Send size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {posts.length === 0 && (
                        <div className="text-center p-20 glass-card bg-slate-900/40 border-dashed border-slate-800">
                            <Plus size={48} className="mx-auto text-slate-700 mb-4 opacity-20" />
                            <p className="text-slate-500 font-medium">Your community feed is waiting for its first post.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar Widgets */}
            <div className="space-y-6 lg:sticky lg:top-24">
                <div className="glass-card p-6 bg-slate-900 border-slate-800 border-t-4 border-t-primary-600 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Bell size={18} className="text-primary-500" />
                            <h3 className="text-base font-bold text-white">Notice Board</h3>
                        </div>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-lg font-bold">LIVE</span>
                    </div>
                    <div className="space-y-4">
                        {notices.map((notice, idx) => (
                            <div key={idx} className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/30 hover:bg-primary-500/5 hover:border-primary-500/30 transition-all cursor-pointer group">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-primary-500 shadow-sm shadow-primary-500/50"></div>
                                    <p className="text-[10px] text-primary-500 font-black uppercase tracking-tighter">Campus Update</p>
                                </div>
                                <h4 className="text-sm font-bold text-white group-hover:text-primary-400 transition-colors mb-1">{notice.title}</h4>
                                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{notice.description}</p>
                            </div>
                        ))}
                        <button className="w-full py-3 text-[11px] font-bold text-slate-500 hover:text-primary-500 transition-colors bg-slate-800/20 rounded-xl hover:bg-primary-500/5">
                            View All Announcements
                        </button>
                    </div>
                </div>

                <div className="glass-card p-6 bg-gradient-to-br from-primary-900/30 to-slate-900 border-primary-500/20 overflow-hidden relative group">
                    <div className="absolute -right-8 -bottom-8 text-primary-500/5 rotate-12 group-hover:rotate-0 transition-transform duration-700"><Heart size={160} /></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <ShieldCheck size={16} className="text-emerald-500" />
                            <h3 className="text-emerald-500 font-black text-[10px] uppercase tracking-widest">Community Safety</h3>
                        </div>
                        <p className="text-3xl font-black text-white mb-1">98.4%</p>
                        <p className="text-xs text-slate-400 font-medium">AI-Moderated Integrity Score</p>
                        <div className="mt-6 w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 w-[98.4%] shadow-sm shadow-emerald-500/50" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
