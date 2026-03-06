import React, { useState, useEffect, useRef } from 'react'
import { Send, Loader2, MessageCircle, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { moderateContent } from '../utils/moderation'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs) {
    return twMerge(clsx(inputs))
}

export default function GroupChat() {
    const { user, profile } = useAuth()
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const messagesEndRef = useRef(null)

    useEffect(() => {
        fetchMessages()

        // Subscribe to new messages
        const subscription = supabase
            .channel('public:group_messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'group_messages'
            }, payload => {
                fetchMessages() // Refetch to get profile details, or manually append
            })
            .subscribe()

        return () => {
            supabase.removeChannel(subscription)
        }
    }, [])

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const fetchMessages = async () => {
        try {
            const { data, error } = await supabase
                .from('group_messages')
                .select(`
                    *,
                    profiles:user_id (full_name, avatar_url, role)
                `)
                .order('created_at', { ascending: true })
                .limit(100)

            if (error) {
                // Ignore table not found initially, we might need to create it
                if (error.code !== '42P01') {
                    console.error('Error fetching messages:', error)
                }
            } else {
                setMessages(data || [])
            }
        } catch (err) {
            console.error('Fetch error:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleSendMessage = async (e) => {
        e.preventDefault()
        const trimmedMessage = newMessage.trim()
        if (!trimmedMessage || sending) return

        setSending(true)

        try {
            // AI Moderation check
            const isAppropriate = await moderateContent(trimmedMessage)

            if (!isAppropriate) {
                alert("Your message violates our community guidelines. Please keep the chat appropriate for college use.")
                setSending(false)
                return
            }

            const { error } = await supabase
                .from('group_messages')
                .insert([{
                    content: trimmedMessage,
                    user_id: user.id
                }])

            if (error) {
                if (error.code === '42P01') {
                    alert("Group messages table doesn't exist yet! Please run the database migration.")
                } else {
                    throw error
                }
            } else {
                setNewMessage('')
            }
        } catch (error) {
            console.error('Error sending message:', error)
            alert('Failed to send message: ' + error.message)
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col glass-card bg-[var(--card-bg)] border-[var(--card-border)] overflow-hidden">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-[var(--card-border)] bg-[var(--input-bg)]/50 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-500">
                    <MessageCircle size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-black text-[var(--foreground)] tracking-tight">Global Group Chat</h2>
                    <p className="text-sm text-[var(--text-muted)] font-medium">Chat with everyone in the college</p>
                </div>
            </div>

            {/* Warning Banner */}
            <div className="bg-amber-500/10 border-y border-amber-500/20 px-4 py-3 flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-amber-600/90 dark:text-amber-400">
                    AI Moderation is active. Messages are monitored to ensure a safe, college-appropriate environment. Inappropriate content will be blocked.
                </p>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="animate-spin text-primary-500" size={32} />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] space-y-4">
                        <MessageCircle size={48} className="opacity-20" />
                        <p className="font-medium">No messages yet. Be the first to say hello!</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = msg.user_id === user.id
                        const showAvatar = idx === 0 || messages[idx - 1].user_id !== msg.user_id

                        return (
                            <div key={msg.id} className={cn(
                                "flex gap-3 max-w-[85%]",
                                isMe ? "ml-auto flex-row-reverse" : ""
                            )}>
                                {/* Avatar */}
                                <div className="w-8 shrink-0 flex flex-col justify-end pb-1">
                                    {showAvatar && !isMe && (
                                        <div className="w-8 h-8 rounded-xl bg-[var(--input-bg)] flex items-center justify-center overflow-hidden border border-[var(--card-border)]">
                                            {msg.profiles?.avatar_url ? (
                                                <img src={msg.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xs font-black text-[var(--text-muted)]">
                                                    {msg.profiles?.full_name?.charAt(0) || '?'}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Message Bubble */}
                                <div className={cn(
                                    "flex flex-col",
                                    isMe ? "items-end" : "items-start"
                                )}>
                                    {showAvatar && !isMe && (
                                        <div className="flex items-center gap-2 mb-1 ml-1">
                                            <span className="text-[10px] font-bold text-[var(--text-muted)]">
                                                {msg.profiles?.full_name || 'Unknown User'}
                                            </span>
                                            {msg.profiles?.role && (
                                                <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[var(--input-bg)] text-[var(--foreground)]">
                                                    {msg.profiles.role}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <div className={cn(
                                        "px-4 py-3 shadow-sm",
                                        isMe
                                            ? "bg-primary-600 text-white rounded-[1.5rem] rounded-br-sm"
                                            : "glass-card bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--foreground)] rounded-[1.5rem] rounded-bl-sm"
                                    )}>
                                        <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                    </div>
                                    <span className="text-[9px] font-bold text-[var(--text-muted)] mt-1.5 opacity-60 mx-1">
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        )
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-[var(--card-border)] bg-[var(--input-bg)]/30">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        disabled={sending}
                        className="flex-1 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl px-5 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all text-[var(--foreground)] placeholder:text-[var(--text-muted)]"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:hover:bg-primary-600 text-white p-3.5 rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-primary-600/20 active:scale-95"
                    >
                        {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                    </button>
                </form>
            </div>
        </div>
    )
}
