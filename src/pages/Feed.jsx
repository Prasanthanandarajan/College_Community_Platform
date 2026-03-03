import React, { useState, useEffect, useRef } from 'react'
import { Plus, Send, Image as ImageIcon, MessageCircle, Heart, Share2, MoreVertical, Bell, X, Loader2 } from 'lucide-react'
import { moderateContent } from '../utils/moderation'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

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
        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            <div className="lg:col-span-2 space-y-6">
                {/* Create Post */}
                <div className="glass-card p-6 bg-slate-900 border-slate-800 shadow-xl">
                    <form onSubmit={handleSubmit}>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex-shrink-0 flex items-center justify-center text-slate-500 overflow-hidden">
                                {profile?.avatar_url ? <img src={profile.avatar_url} alt="Me" className="w-full h-full object-cover" /> : <Plus size={20} />}
                            </div>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Share something with your college community..."
                                className="w-full bg-slate-800/30 border border-slate-700/50 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all resize-none h-28"
                            />
                        </div>

                        {imagePreview && (
                            <div className="relative mt-3 ml-14">
                                <img src={imagePreview} alt="Preview" className="max-h-48 rounded-xl border border-slate-700 object-cover" />
                                <button type="button" onClick={() => { setImageFile(null); setImagePreview(null) }} className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full hover:bg-red-500 transition-all">
                                    <X size={16} />
                                </button>
                            </div>
                        )}

                        {message && (
                            <p className={`text-sm mt-3 px-3 py-2 rounded-lg border ${message.type === 'error' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"}`}>
                                {message.text}
                            </p>
                        )}

                        <div className="flex justify-between items-center mt-4 pl-14">
                            <div className="flex gap-2">
                                <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-slate-400 hover:text-primary-400 p-2 hover:bg-slate-800 rounded-lg transition-all flex items-center gap-1">
                                    <ImageIcon size={20} /> <span className="text-xs">Photo</span>
                                </button>
                            </div>
                            <button disabled={loading || (!content.trim() && !imageFile)} className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary-600/20">
                                {loading ? <><Loader2 size={18} className="animate-spin" /> Analyzing...</> : <>Share Post <Send size={18} /></>}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Posts */}
                <div className="space-y-6">
                    {posts.map((post) => (
                        <div key={post.id} className="glass-card p-6 bg-slate-900 border-slate-800 hover:border-slate-700 transition-all shadow-sm">
                            {/* Post Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-800 overflow-hidden border border-slate-700 flex items-center justify-center text-slate-500 font-bold">
                                        {post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : (post.profiles?.full_name?.charAt(0) || 'U')}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                            {post.profiles?.full_name}
                                            {post.profiles?.role === 'faculty' && <span className="bg-primary-600/20 text-primary-400 text-[10px] px-1.5 py-0.5 rounded uppercase">Faculty</span>}
                                        </h4>
                                        <p className="text-[10px] text-slate-500">{new Date(post.created_at).toLocaleDateString()} at {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Post Content */}
                            <div className="text-slate-300 text-sm leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</div>
                            {post.image_url && (
                                <div className="mb-4 rounded-2xl overflow-hidden border border-slate-800">
                                    <img src={post.image_url} alt="Post" className="w-full h-auto object-cover max-h-96" />
                                </div>
                            )}

                            {/* Like & Comment Buttons */}
                            <div className="flex items-center gap-6 pt-4 border-t border-slate-800/50">
                                <button
                                    onClick={() => handleLike(post.id)}
                                    className={`flex items-center gap-2 text-xs font-bold transition-all ${myLikes[post.id] ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'}`}
                                >
                                    <Heart size={18} fill={myLikes[post.id] ? 'currentColor' : 'none'} />
                                    {likes[post.id] || 0} {likes[post.id] === 1 ? 'Like' : 'Likes'}
                                </button>
                                <button
                                    onClick={() => setOpenComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                                    className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-primary-500 transition-all"
                                >
                                    <MessageCircle size={18} />
                                    {(comments[post.id]?.length || 0)} Comments
                                </button>
                            </div>

                            {/* Comments Section */}
                            {openComments[post.id] && (
                                <div className="mt-4 pt-4 border-t border-slate-800/50 space-y-3">
                                    {(comments[post.id] || []).map(c => (
                                        <div key={c.id} className="flex items-start gap-3">
                                            <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 font-bold flex-shrink-0 overflow-hidden">
                                                {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : (c.profiles?.full_name?.charAt(0) || '?')}
                                            </div>
                                            <div className="bg-slate-800/50 rounded-xl px-3 py-2 flex-1">
                                                <p className="text-[10px] font-bold text-slate-400">{c.profiles?.full_name}</p>
                                                <p className="text-sm text-white">{c.content}</p>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add Comment */}
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={commentText[post.id] || ''}
                                            onChange={(e) => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                                            onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                                            placeholder="Write a comment..."
                                            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                        <button
                                            onClick={() => handleComment(post.id)}
                                            className="p-2 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition-all"
                                        >
                                            <Send size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {posts.length === 0 && (
                        <div className="text-center p-20 glass-card bg-slate-900/50 border-dashed border-slate-800">
                            <p className="text-slate-500">No posts yet. Be the first to share something!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
                <div className="glass-card p-6 bg-slate-900 border-slate-800 border-t-4 border-t-primary-600">
                    <div className="flex items-center gap-2 mb-6">
                        <Bell size={20} className="text-primary-500" />
                        <h3 className="text-lg font-bold text-white">Notice Board</h3>
                    </div>
                    <div className="space-y-4">
                        {notices.map((notice, idx) => (
                            <div key={idx} className="p-4 bg-slate-800/30 rounded-xl border border-slate-800 hover:bg-slate-800/50 transition-all cursor-pointer">
                                <p className="text-[10px] text-primary-500 font-bold uppercase mb-1">Campus Update</p>
                                <h4 className="text-sm font-bold text-white mb-2">{notice.title}</h4>
                                <p className="text-xs text-slate-400 line-clamp-2">{notice.description}</p>
                            </div>
                        ))}
                        {notices.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No notices yet</p>}
                    </div>
                </div>

                <div className="glass-card p-6 bg-primary-900/20 border-primary-500/20 overflow-hidden relative">
                    <div className="absolute -right-4 -bottom-4 text-primary-500/10 rotate-12"><Heart size={120} /></div>
                    <h3 className="text-primary-400 font-bold text-sm mb-2 uppercase tracking-tight">Community Health</h3>
                    <p className="text-2xl font-bold text-white mb-1">98.4%</p>
                    <p className="text-xs text-slate-400">Content safety score today</p>
                    <div className="mt-4 w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 w-[98.4%]" />
                    </div>
                </div>
            </div>
        </div>
    )
}
