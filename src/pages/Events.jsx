import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Calendar, MapPin, Plus, Loader2, Clock, Users, Trash2, X } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs) {
    return twMerge(clsx(inputs))
}

export default function Events() {
    const { user, isAdmin } = useAuth()
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)

    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [date, setDate] = useState('')
    const [location, setLocation] = useState('')
    const [department, setDepartment] = useState('')

    useEffect(() => {
        fetchEvents()

        // Real-time subscription
        const channel = supabase
            .channel('events-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
                fetchEvents()
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    const fetchEvents = async () => {
        const { data, error } = await supabase
            .from('events')
            .select('*, profiles(full_name)')
            .order('event_date', { ascending: true })

        if (error) console.error(error)
        else setEvents(data)
        setLoading(false)
    }

    const handleCreate = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { error } = await supabase.from('events').insert({
                creator_id: user.id,
                title,
                description,
                event_date: date,
                location,
                department
            })

            if (error) alert(error.message)
            else {
                setShowModal(false)
                setTitle(''); setDescription(''); setDate(''); setLocation(''); setDepartment('')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this event?')) return
        const { error } = await supabase.from('events').delete().eq('id', id)
        if (error) alert('Failed to delete event: ' + error.message)
        else fetchEvents()
    }

    const upcomingEvents = events.filter(e => new Date(e.event_date) > new Date())
    const pastEvents = events.filter(e => new Date(e.event_date) <= new Date())

    return (
        <div className="space-y-10 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h2 className="text-3xl lg:text-4xl font-extrabold text-[var(--foreground)] tracking-tight">Campus Events</h2>
                    <p className="text-[var(--text-muted)] mt-1 font-medium italic">Discover what's happening around the college</p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-primary-600 hover:bg-primary-500 text-white px-8 py-4 rounded-2xl font-black transition-all shadow-2xl shadow-primary-600/30 active:scale-[0.98]"
                    >
                        <Plus size={20} className="stroke-[3]" />
                        <span>Create Event</span>
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-20">
                    <Loader2 className="text-primary-500 animate-spin" size={48} />
                </div>
            ) : (
                <>
                    {/* Upcoming Events */}
                    {upcomingEvents.length > 0 && (
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                                <h3 className="text-xl font-black text-[var(--foreground)] flex items-center gap-2 uppercase tracking-widest text-sm">
                                    Upcoming Events
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
                                {upcomingEvents.map((event) => (
                                    <EventCard key={event.id} event={event} upcoming isAdmin={isAdmin} user={user} handleDelete={handleDelete} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Past Events */}
                    {pastEvents.length > 0 && (
                        <div>
                            <div className="flex items-center gap-3 mb-6 opacity-60">
                                <div className="w-1.5 h-6 bg-slate-500 rounded-full"></div>
                                <h3 className="text-xl font-black text-[var(--foreground)] flex items-center gap-2 uppercase tracking-widest text-sm">
                                    Past Events
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
                                {pastEvents.map((event) => (
                                    <EventCard key={event.id} event={event} isAdmin={isAdmin} user={user} handleDelete={handleDelete} />
                                ))}
                            </div>
                        </div>
                    )}

                    {events.length === 0 && (
                        <div className="text-center p-20 glass-card bg-slate-900/50 border-dashed border-slate-800">
                            <Calendar size={48} className="mx-auto text-slate-600 mb-4" />
                            <p className="text-slate-500">No events yet. Faculty can create new events!</p>
                        </div>
                    )}
                </>
            )}

            {/* Create Event Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 lg:p-6 animate-fade-in">
                    <div className="glass-card bg-[var(--card-bg)] border-[var(--card-border)] w-full max-w-xl p-6 lg:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-2xl lg:text-3xl font-black text-[var(--foreground)] tracking-tight">Create Event</h3>
                                <p className="text-[var(--text-muted)] text-sm font-medium mt-1">Host a new community gathering</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-primary-600 uppercase tracking-widest pl-1">Event Title</label>
                                <input
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="input-style w-full px-5 py-4"
                                    placeholder="e.g. Annual Tech Symposium"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-primary-600 uppercase tracking-widest pl-1">Department / Organization</label>
                                <input
                                    value={department}
                                    onChange={(e) => setDepartment(e.target.value)}
                                    className="input-style w-full px-5 py-4"
                                    placeholder="e.g. Mechanical Engineering"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-primary-600 uppercase tracking-widest pl-1">Description</label>
                                <textarea
                                    required
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="input-style w-full px-5 py-4 h-32 resize-none"
                                    placeholder="What's happening at this event?"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-primary-600 uppercase tracking-widest pl-1">Schedule</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="input-style w-full px-5 py-4"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-primary-600 uppercase tracking-widest pl-1">Venue</label>
                                    <input
                                        required
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="input-style w-full px-5 py-4"
                                        placeholder="Main Auditorium"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 bg-[var(--input-bg)] hover:bg-slate-200 dark:hover:bg-slate-800 text-[var(--foreground)] font-bold py-4 rounded-2xl transition-all border border-[var(--input-border)]"
                                >
                                    Discard
                                </button>
                                <button
                                    type="submit"
                                    className="flex-2 bg-primary-600 hover:bg-primary-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-primary-600/30 transition-all active:scale-[0.98]"
                                >
                                    Publish Event
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

function EventCard({ event, upcoming, isAdmin, user, handleDelete }) {
    return (
        <div className={cn(
            "glass-card bg-[var(--card-bg)] border-[var(--card-border)] group hover:border-primary-500 transition-all overflow-hidden flex flex-col",
            !upcoming && "opacity-60 saturate-50 hover:opacity-100 hover:saturate-100"
        )}>
            <div className="h-40 bg-gradient-to-br from-primary-600/20 to-primary-900/40 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.1),transparent)]" />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--card-bg)] to-transparent" />

                <div className="absolute top-4 left-4 flex gap-2">
                    <span className={cn(
                        "text-[10px] text-white font-black uppercase px-3 py-1.5 rounded-lg shadow-lg",
                        upcoming ? "bg-emerald-500 shadow-emerald-500/20" : "bg-slate-500 shadow-slate-500/20"
                    )}>
                        {upcoming ? 'Live Update' : 'Concluded'}
                    </span>
                    {event.department && (
                        <span className="text-[10px] bg-white/10 backdrop-blur-md text-white px-3 py-1.5 rounded-lg font-black uppercase tracking-tighter border border-white/10">
                            {event.department}
                        </span>
                    )}
                </div>

                <div className="absolute bottom-4 left-6 right-6">
                    <h3 className="text-xl lg:text-2xl font-black text-[var(--foreground)] group-hover:text-primary-600 transition-colors line-clamp-1 truncate drop-shadow-sm">
                        {event.title}
                    </h3>
                </div>
            </div>

            <div className="p-6 space-y-5 flex-1 flex flex-col">
                <p className="text-[var(--text-muted)] text-sm leading-relaxed line-clamp-3 font-medium">
                    {event.description}
                </p>

                <div className="space-y-3 pt-4 border-t border-[var(--card-border)] mt-auto">
                    <div className="flex items-center gap-3 text-sm font-bold text-[var(--foreground)]">
                        <div className="w-8 h-8 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500">
                            <Calendar size={18} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-black">Date</span>
                            <span>{new Date(event.event_date).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-bold text-[var(--foreground)]">
                        <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                            <MapPin size={18} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-black">Location</span>
                            <span className="line-clamp-1">{event.location}</span>
                        </div>
                    </div>
                </div>

                <div className="pt-5 border-t border-[var(--card-border)] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-[var(--input-bg)] border border-[var(--card-border)] flex items-center justify-center text-xs text-[var(--text-muted)] font-black uppercase shadow-sm">
                            {event.profiles?.full_name?.charAt(0) || '?'}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-black leading-none">Organizer</span>
                            <span className="text-xs font-bold text-[var(--foreground)] mt-1">{event.profiles?.full_name}</span>
                        </div>
                    </div>

                    {(isAdmin || event.creator_id === user.id) && (
                        <button
                            onClick={() => handleDelete(event.id)}
                            className="p-2.5 bg-rose-500/5 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl transition-all border border-rose-500/20 group/del shadow-sm hover:shadow-rose-500/30"
                            title="Delete Event"
                        >
                            <Trash2 size={18} className="transition-transform group-hover/del:scale-110" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
