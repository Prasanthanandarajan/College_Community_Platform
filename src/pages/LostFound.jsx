import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Search, MapPin, Plus, Loader2, AlertCircle, CheckCircle, PackageSearch, X, Filter } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { moderateContent } from '../utils/moderation'

function cn(...inputs) {
    return twMerge(clsx(inputs))
}

export default function LostFound() {
    const { user, isAdmin } = useAuth()
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all') // 'all', 'lost', 'found'
    const [showModal, setShowModal] = useState(false)

    // Form state
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [location, setLocation] = useState('')
    const [itemType, setItemType] = useState('lost') // 'lost' or 'found'
    const [contactInfo, setContactInfo] = useState('')

    useEffect(() => {
        fetchItems()
        const channel = supabase
            .channel('lostfound-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'lost_found' }, () => {
                fetchItems()
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [])

    const fetchItems = async () => {
        const { data, error } = await supabase
            .from('lost_found')
            .select('*, profiles(full_name)')
            .order('created_at', { ascending: false })

        if (error) console.error(error)
        else setItems(data)
        setLoading(false)
    }

    const handleCreate = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Moderate content
            const contentToModerate = `${title} ${description}`
            const result = await moderateContent(contentToModerate, 'lost_found', user.id)
            if (result.flagged) {
                alert('🚫 Item report blocked by AI. Contains inappropriate content.')
                setLoading(false)
                return
            }

            const { error } = await supabase.from('lost_found').insert({
                reporter_id: user.id,
                title,
                description,
                location,
                item_type: itemType,
                contact_info: contactInfo
            })

            if (error) throw error

            setShowModal(false)
            setTitle(''); setDescription(''); setLocation(''); setContactInfo('')
        } catch (err) {
            alert(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleResolve = async (id) => {
        const { error } = await supabase
            .from('lost_found')
            .update({ resolved: true })
            .eq('id', id)
        if (error) alert('Failed to mark as resolved: ' + error.message)
        else fetchItems()
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this report?')) return
        const { error } = await supabase.from('lost_found').delete().eq('id', id)
        if (error) alert('Failed to delete report: ' + error.message)
        else fetchItems()
    }

    const filteredItems = items.filter(item => {
        if (filter === 'all') return true
        return item.item_type === filter
    })

    return (
        <div className="space-y-10 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl lg:text-4xl font-black text-[var(--foreground)] tracking-tight">Lost & Found Hub</h2>
                    <p className="text-[var(--text-muted)] mt-1 font-medium italic">Recover your belongings or help others find theirs</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-primary-600/20 transition-all hover:scale-105 active:scale-95 group w-full md:w-auto"
                >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                    <span>Report Item</span>
                </button>
            </div>

            {/* Interaction Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center bg-[var(--input-bg)] p-3 rounded-[2rem] border border-[var(--card-border)] shadow-inner animate-fade-in">
                <div className="flex gap-2 w-full sm:w-auto">
                    {['all', 'lost', 'found'].map(t => (
                        <button
                            key={t}
                            onClick={() => setFilter(t)}
                            className={cn(
                                "flex-1 sm:flex-none px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all",
                                filter === t
                                    ? "bg-[var(--foreground)] text-[var(--card-bg)] shadow-lg"
                                    : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
                            )}
                        >
                            {t}
                        </button>
                    ))}
                </div>
                <div className="h-4 w-px bg-[var(--card-border)] hidden sm:block mx-2" />
                <div className="flex items-center gap-2 text-[var(--text-muted)] px-4">
                    <Filter size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Display Filter</span>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4 text-[var(--text-muted)]">
                    <Loader2 className="text-primary-500 animate-spin" size={48} />
                    <p className="font-black text-[10px] uppercase tracking-widest">Scanning Campus Records...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10 animate-fade-in-up">
                    {filteredItems.map(item => (
                        <div key={item.id} className={cn(
                            "glass-card bg-[var(--card-bg)] border-[var(--card-border)] overflow-hidden transition-all duration-500 group hover:border-primary-500/50 hover:shadow-2xl flex flex-col h-full",
                            item.resolved ? 'opacity-40 grayscale-[0.5]' : ''
                        )}>
                            <div className={cn(
                                "p-4 border-b flex justify-between items-center transition-colors",
                                item.item_type === 'lost'
                                    ? 'border-rose-500/20 bg-rose-500/5 group-hover:bg-rose-500/10'
                                    : 'border-emerald-500/20 bg-emerald-500/5 group-hover:bg-emerald-500/10'
                            )}>
                                <div className={cn(
                                    "flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]",
                                    item.item_type === 'lost' ? 'text-rose-500' : 'text-emerald-500'
                                )}>
                                    {item.item_type === 'lost' ? <AlertCircle size={14} className="stroke-[3]" /> : <CheckCircle size={14} className="stroke-[3]" />}
                                    <span>{item.item_type} Item</span>
                                </div>
                                {item.resolved && (
                                    <span className="text-[9px] bg-[var(--input-bg)] text-[var(--text-muted)] px-3 py-1 rounded-full font-black uppercase tracking-widest border border-[var(--card-border)]">
                                        Handled
                                    </span>
                                )}
                            </div>
                            <div className="p-8 flex-1 flex flex-col space-y-5">
                                <h3 className="text-2xl font-black text-[var(--foreground)] tracking-tight line-clamp-2 leading-tight">{item.title}</h3>
                                <p className="text-[var(--text-muted)] text-sm font-medium line-clamp-3 leading-relaxed">{item.description}</p>
                            </div>

                            <div className="px-8 pb-8 space-y-4">
                                <div className="space-y-3 pt-6 border-t border-[var(--card-border)]">
                                    <div className="flex items-center gap-3 text-xs font-bold text-[var(--text-muted)]">
                                        <div className="w-8 h-8 rounded-lg bg-[var(--input-bg)] flex items-center justify-center text-primary-500 shadow-sm">
                                            <MapPin size={16} />
                                        </div>
                                        <span>{item.location}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs font-bold text-[var(--text-muted)]">
                                        <div className="w-8 h-8 rounded-lg bg-[var(--input-bg)] flex items-center justify-center text-emerald-500 shadow-sm">
                                            <PackageSearch size={16} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase tracking-widest opacity-40">Contact</span>
                                            <span>{item.contact_info || item.profiles?.full_name}</span>
                                        </div>
                                    </div>
                                </div>

                                {!item.resolved && (item.reporter_id === user.id || isAdmin) && (
                                    <button
                                        onClick={() => handleResolve(item.id)}
                                        className="w-full bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] py-4 rounded-2xl transition-all border border-emerald-500/10"
                                    >
                                        Mark as Resolved
                                    </button>
                                )}
                                {isAdmin && (
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="w-full mt-2 bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] py-4 rounded-2xl transition-all border border-rose-500/10"
                                    >
                                        Delete Report
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {filteredItems.length === 0 && (
                        <div className="col-span-full py-32 flex flex-col items-center justify-center glass-card bg-[var(--input-bg)] border-dashed border-[var(--card-border)] text-center px-10">
                            <div className="w-24 h-24 bg-[var(--card-bg)] rounded-[2.5rem] flex items-center justify-center text-[var(--text-muted)] opacity-20 mb-6 rotate-12">
                                <PackageSearch size={48} />
                            </div>
                            <h4 className="text-xl font-black text-[var(--foreground)] tracking-tight">Search Result Empty</h4>
                            <p className="text-sm text-[var(--text-muted)] max-w-xs mt-2 font-medium">No campus reports matching "{filter}" were found in our temporary vault.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 lg:p-6 animate-fade-in">
                    <div className="glass-card bg-[var(--card-bg)] border-[var(--card-border)] w-full max-w-xl p-8 lg:p-12 max-h-[90vh] overflow-y-auto shadow-2xl relative">
                        <div className="flex justify-between items-start mb-10">
                            <div>
                                <h3 className="text-3xl font-black text-[var(--foreground)] tracking-tight">Report Canvas Item</h3>
                                <p className="text-[var(--text-muted)] font-medium mt-1 italic">Providing details helps fast recovery</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-3 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all group">
                                <X size={24} className="group-hover:rotate-90 transition-transform" />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-8">
                            <div className="flex gap-4 p-2 bg-[var(--input-bg)] rounded-[2rem] border border-[var(--card-border)] shadow-inner">
                                <button
                                    type="button"
                                    onClick={() => setItemType('lost')}
                                    className={cn(
                                        "flex-1 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all",
                                        itemType === 'lost' ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/20' : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
                                    )}
                                >
                                    I Lost Something
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setItemType('found')}
                                    className={cn(
                                        "flex-1 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all",
                                        itemType === 'found' ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
                                    )}
                                >
                                    I Found Something
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-primary-600 uppercase tracking-widest pl-1">Item Title</label>
                                    <input
                                        required
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="input-style w-full px-6 py-4"
                                        placeholder="e.g. Silver Laptop, Lab Journal"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-primary-600 uppercase tracking-widest pl-1">Location Coordinates</label>
                                    <input
                                        required
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="input-style w-full px-6 py-4"
                                        placeholder="e.g. Block A, Room 402"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-primary-600 uppercase tracking-widest pl-1">Visual & Physical Trace</label>
                                <textarea
                                    required
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="input-style w-full px-6 py-4 h-32 resize-none"
                                    placeholder="Mention brand, colors, identification stickers, etc."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-primary-600 uppercase tracking-widest pl-1">Secure Contact Link (Optional)</label>
                                <input
                                    value={contactInfo}
                                    onChange={(e) => setContactInfo(e.target.value)}
                                    className="input-style w-full px-6 py-4"
                                    placeholder="WhatsApp, Phone, or Dorm detail"
                                />
                            </div>

                            <div className="flex gap-4 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 bg-[var(--input-bg)] hover:bg-slate-800 text-[var(--foreground)] font-black py-5 rounded-[2rem] transition-all border border-[var(--card-border)] uppercase text-[10px] tracking-widest"
                                >
                                    Discard
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-2 bg-primary-600 hover:bg-primary-500 text-white font-black py-5 rounded-[2rem] shadow-2xl shadow-primary-600/30 transition-all uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : <span>Dispatch Report</span>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
