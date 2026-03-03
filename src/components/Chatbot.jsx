import React, { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, User, Bot, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '../context/AuthContext'

export default function Chatbot() {
    const { user, profile } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState([
        { role: 'bot', content: 'Hello! I am your CollegeCommunity assistant. How can I help you today?' }
    ])
    const [input, setInput] = useState('')
    const [isThinking, setIsThinking] = useState(false)
    const scrollRef = useRef(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isThinking])

    const handleSendMessage = async (e) => {
        e.preventDefault()
        if (!input.trim() || isThinking) return

        const userMessage = input.trim()
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: userMessage }])

        setIsThinking(true)

        // Simulate AI "Thinking" and response
        setTimeout(() => {
            let response = "I'm still learning about the college community features. You can post updates, join communities, and check out upcoming events!"

            if (userMessage.toLowerCase().includes('event')) {
                response = "You can find all campus events in the 'Events' tab. faculty members usually post notices there."
            } else if (userMessage.toLowerCase().includes('help')) {
                response = "I can help you navigate the platform. Try looking at the Feed for updates or your Profile to customize your appearance."
            } else if (userMessage.toLowerCase().includes('role')) {
                response = `You are registered as a ${profile?.role || 'student'}. Faculty members have additional permissions to post notices.`
            }

            setMessages(prev => [...prev, { role: 'bot', content: response }])
            setIsThinking(false)
        }, 1500)
    }

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Chatbot Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500",
                    isOpen ? "bg-rose-500 rotate-90" : "bg-primary-600 hover:scale-110 shadow-primary-500/30"
                )}
            >
                {isOpen ? <X className="text-white" size={28} /> : <MessageCircle className="text-white" size={28} />}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="absolute bottom-20 right-0 w-[380px] h-[500px] glass-card flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
                    {/* Header */}
                    <div className="bg-primary-600 p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                            <Bot className="text-white" size={24} />
                        </div>
                        <div>
                            <h3 className="text-white font-bold leading-none">Campus AI</h3>
                            <p className="text-primary-100 text-[10px] mt-1">Always here to help</p>
                        </div>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
                        {messages.map((m, i) => (
                            <div key={i} className={clsx("flex", m.role === 'user' ? "justify-end" : "justify-start")}>
                                <div className={clsx(
                                    "max-w-[80%] p-3 rounded-2xl text-sm shadow-sm",
                                    m.role === 'user'
                                        ? "bg-primary-600 text-white rounded-tr-none"
                                        : "bg-[var(--input-bg)] text-[var(--foreground)] border border-[var(--card-border)] rounded-tl-none"
                                )}>
                                    {m.content}
                                </div>
                            </div>
                        ))}
                        {isThinking && (
                            <div className="flex justify-start">
                                <div className="bg-[var(--input-bg)] text-[var(--foreground)] border border-[var(--card-border)] p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce"></div>
                                    </div>
                                    <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">AI is Thinking</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSendMessage} className="p-4 border-t border-[var(--card-border)] bg-[var(--background)] flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask me anything..."
                            className="input-style flex-1 px-4 py-2 text-sm"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isThinking}
                            className="w-10 h-10 bg-primary-600 text-white rounded-xl flex items-center justify-center hover:bg-primary-500 disabled:opacity-50 transition-all"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            )}
        </div>
    )
}
