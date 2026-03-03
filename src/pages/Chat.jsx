import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Send, Hash, User, ShieldAlert, Bot, MessageSquare, Loader2 } from 'lucide-react'
import { moderateContent } from '../utils/moderation'

function cn(...inputs) { return inputs.filter(Boolean).join(' ') }

export default function Chat() {
    const { user, profile } = useAuth()
    const [activeTab, setActiveTab] = useState('group')
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const scrollRef = useRef()

    // AI Chatbot state
    const [botMessages, setBotMessages] = useState([
        { role: 'bot', content: '👋 Hi! I\'m your AI Study Assistant. Ask me anything about your studies, assignments, or campus life!' }
    ])
    const [botInput, setBotInput] = useState('')
    const [botLoading, setBotLoading] = useState(false)
    const botScrollRef = useRef()

    useEffect(() => {
        fetchMessages()
        const channel = supabase
            .channel('chat-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => fetchMessages())
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [])

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    useEffect(() => {
        botScrollRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [botMessages])

    const fetchMessages = async () => {
        const { data } = await supabase
            .from('messages')
            .select('*, profiles(full_name, avatar_url)')
            .eq('status', 'approved')
            .order('created_at', { ascending: true })
        if (data) setMessages(data)
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
                room_id: 'global',
                status: 'approved'
            })
        } catch (error) {
            alert('Failed to send message')
        } finally {
            setLoading(false)
        }
    }

    // AI Chatbot - uses a simple local response (no external API needed)
    const handleBotSend = async (e) => {
        e.preventDefault()
        if (!botInput.trim() || botLoading) return

        const question = botInput
        setBotInput('')
        setBotMessages(prev => [...prev, { role: 'user', content: question }])
        setBotLoading(true)

        // Simulate AI response with helpful answers
        setTimeout(() => {
            const response = generateBotResponse(question)
            setBotMessages(prev => [...prev, { role: 'bot', content: response }])
            setBotLoading(false)
        }, 800)
    }

    return (
        <div className="flex flex-col h-[calc(100vh-12rem)] max-w-5xl mx-auto glass-card bg-slate-900 border-slate-800 overflow-hidden">
            {/* Tab Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <div className="flex gap-2 bg-slate-800 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('group')}
                        className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                            activeTab === 'group' ? "bg-primary-600 text-white" : "text-slate-400 hover:text-white"
                        )}
                    >
                        <Hash size={16} /> Group Chat
                    </button>
                    <button
                        onClick={() => setActiveTab('bot')}
                        className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                            activeTab === 'bot' ? "bg-primary-600 text-white" : "text-slate-400 hover:text-white"
                        )}
                    >
                        <Bot size={16} /> AI Assistant
                    </button>
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {activeTab === 'group' ? 'Live Moderation' : 'AI Powered'}
                </div>
            </div>

            {/* GROUP CHAT TAB */}
            {activeTab === 'group' && (
                <>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex gap-4 ${msg.sender_id === user.id ? 'flex-row-reverse' : ''}`}>
                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex-shrink-0 flex items-center justify-center text-slate-400 border border-slate-700 self-end overflow-hidden">
                                    {msg.profiles?.avatar_url ? <img src={msg.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={20} />}
                                </div>
                                <div className={`max-w-[70%] space-y-1 ${msg.sender_id === user.id ? 'text-right' : ''}`}>
                                    <p className="text-xs font-bold text-slate-500">{msg.profiles?.full_name || 'User'}</p>
                                    <div className={`px-4 py-3 rounded-2xl text-sm ${msg.sender_id === user.id
                                        ? 'bg-primary-600 text-white rounded-tr-none'
                                        : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {messages.length === 0 && <p className="text-center text-slate-500 py-20">No messages yet. Start the conversation!</p>}
                        <div ref={scrollRef} />
                    </div>
                    <div className="p-6 border-t border-slate-800 bg-slate-900/50">
                        <form onSubmit={handleSend} className="relative">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type your message..."
                                className="w-full bg-slate-800 border-slate-700 rounded-2xl px-6 py-4 pr-16 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 border"
                            />
                            <button type="submit" disabled={loading || !newMessage.trim()} className="absolute right-2 top-2 bottom-2 bg-primary-600 hover:bg-primary-500 text-white w-12 rounded-xl flex items-center justify-center transition-all disabled:opacity-50">
                                <Send size={18} />
                            </button>
                        </form>
                        <p className="text-[10px] text-slate-600 mt-3 flex items-center gap-1">
                            <ShieldAlert size={10} /> All messages are monitored by AI for toxic content.
                        </p>
                    </div>
                </>
            )}

            {/* AI CHATBOT TAB */}
            {activeTab === 'bot' && (
                <>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {botMessages.map((msg, idx) => (
                            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center self-end ${msg.role === 'bot' ? 'bg-primary-600/20 text-primary-500' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                                    {msg.role === 'bot' ? <Bot size={18} /> : <User size={18} />}
                                </div>
                                <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm ${msg.role === 'user'
                                    ? 'bg-primary-600 text-white rounded-tr-none'
                                    : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {botLoading && (
                            <div className="flex gap-3">
                                <div className="w-9 h-9 rounded-xl bg-primary-600/20 text-primary-500 flex items-center justify-center">
                                    <Bot size={18} />
                                </div>
                                <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
                                    <Loader2 size={16} className="animate-spin text-primary-500" />
                                    <span className="text-sm text-slate-400">Thinking...</span>
                                </div>
                            </div>
                        )}
                        <div ref={botScrollRef} />
                    </div>
                    <div className="p-6 border-t border-slate-800 bg-slate-900/50">
                        <form onSubmit={handleBotSend} className="relative">
                            <input
                                type="text"
                                value={botInput}
                                onChange={(e) => setBotInput(e.target.value)}
                                placeholder="Ask your doubt..."
                                className="w-full bg-slate-800 border-slate-700 rounded-2xl px-6 py-4 pr-16 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 border"
                            />
                            <button type="submit" disabled={botLoading || !botInput.trim()} className="absolute right-2 top-2 bottom-2 bg-primary-600 hover:bg-primary-500 text-white w-12 rounded-xl flex items-center justify-center transition-all disabled:opacity-50">
                                <Send size={18} />
                            </button>
                        </form>
                        <p className="text-[10px] text-slate-600 mt-3 flex items-center gap-1">
                            <Bot size={10} /> Powered by AI — Ask about assignments, subjects, campus info & more.
                        </p>
                    </div>
                </>
            )}
        </div>
    )
}

// Simple AI chatbot responses for common student questions
function generateBotResponse(question) {
    const q = question.toLowerCase()

    if (q.includes('assignment') || q.includes('homework')) {
        return '📝 For assignments, I recommend:\n1. Break the task into smaller parts\n2. Start with research and outline\n3. Set deadlines for each section\n4. Review and proofread before submission\n\nCheck with your professor for specific guidelines!'
    }
    if (q.includes('exam') || q.includes('test') || q.includes('study')) {
        return '📚 Study tips:\n1. Use active recall — test yourself instead of re-reading\n2. Space your study sessions (don\'t cram!)\n3. Teach concepts to someone else\n4. Practice past papers\n5. Take regular breaks (Pomodoro technique works great!)\n\nGood luck! 🍀'
    }
    if (q.includes('gpa') || q.includes('grade') || q.includes('marks')) {
        return '📊 To improve grades:\n• Attend all lectures and take notes\n• Visit office hours for clarification\n• Form study groups\n• Start assignments early\n• Use campus tutoring services\n\nConsistency is key! 💪'
    }
    if (q.includes('campus') || q.includes('library') || q.includes('facility')) {
        return '🏫 Campus resources:\n• Library: Open 8AM-10PM weekdays\n• Computer Lab: Building B, Floor 2\n• Student Center: Free WiFi & study rooms\n• Health Center: Building A\n\nCheck the campus website for updated hours!'
    }
    if (q.includes('event') || q.includes('festival') || q.includes('club')) {
        return '🎉 Stay updated on events:\n• Check the Events page for upcoming activities\n• Join Communities to connect with clubs\n• Follow the Notice Board on the Feed page\n\nDon\'t miss out on campus life!'
    }
    if (q.includes('help') || q.includes('what can you')) {
        return '🤖 I can help with:\n• Study tips and techniques\n• Assignment guidance\n• Campus information\n• Exam preparation\n• GPA improvement tips\n• General academic advice\n\nJust type your question!'
    }
    if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
        return `👋 Hello ${profile?.full_name || 'there'}! How can I help you today? Ask me about studies, exams, campus facilities, or anything academic!`
    }
    if (q.includes('thank')) {
        return '😊 You\'re welcome! Feel free to ask anytime. Good luck with your studies! 🎓'
    }
    if (q.includes('programming') || q.includes('code') || q.includes('coding')) {
        return '💻 Programming tips:\n• Practice daily on platforms like LeetCode or HackerRank\n• Build small projects to apply concepts\n• Read documentation, not just tutorials\n• Use Git for version control\n• Join coding communities for support\n\nHappy coding! 🚀'
    }

    return `🤔 Great question! Here are some suggestions:\n\n1. Check with your faculty during office hours\n2. Visit the campus library for resources\n3. Ask in the Group Chat — your peers might know!\n4. Check the campus website for official info\n\nI\'m continuously learning to give better answers! 📖`
}
