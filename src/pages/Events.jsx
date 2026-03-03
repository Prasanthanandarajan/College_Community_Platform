import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Calendar, MapPin, Plus, Loader2, Clock, Users } from 'lucide-react'

export default function Events() {
    const { user, profile, isFaculty, isAdmin } = useAuth()
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)

    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [date, setDate] = useState('')
    const [location, setLocation] = useState('')

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

        const { error } = await supabase.from('events').insert({
            creator_id: user.id,
            title,
            description,
            event_date: date,
            location
        })

        if (error) alert(error.message)
        else {
            setShowModal(false)
            setTitle(''); setDescription(''); setDate(''); setLocation('')
        }
        setLoading(false)
    }

    const upcomingEvents = events.filter(e => new Date(e.event_date) > new Date())
    const pastEvents = events.filter(e => new Date(e.event_date) <= new Date())

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white">Campus Events</h2>
                    <p className="text-slate-400">Discover what's happening around the college</p>
                </div>
                {(isFaculty || isAdmin) && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary-500/20"
                    >
                        <Plus size={20} />
                        Create Event
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
                            <h3 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                                <Calendar size={20} /> Upcoming Events
                            </h3>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {upcomingEvents.map((event) => (
                                    <EventCard key={event.id} event={event} upcoming />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Past Events */}
                    {pastEvents.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold text-slate-500 mb-4 flex items-center gap-2">
                                <Clock size={20} /> Past Events
                            </h3>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {pastEvents.map((event) => (
                                    <EventCard key={event.id} event={event} />
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
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="glass-card bg-slate-900 border-slate-800 w-full max-w-lg p-8">
                        <h3 className="text-2xl font-bold text-white mb-6">Create New Event</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Event Title</label>
                                <input
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all border"
                                    placeholder="e.g. Annual Tech Symposium"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                                <textarea
                                    required
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all border h-32 resize-none"
                                    placeholder="What is this event about?"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all border"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Location</label>
                                    <input
                                        required
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all border"
                                        placeholder="Main Auditorium"
                                    />
                                </div>
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

function EventCard({ event, upcoming }) {
    return (
        <div className={`glass-card bg-slate-900 border-slate-800 group hover:border-primary-500/50 transition-all overflow-hidden ${!upcoming ? 'opacity-60' : ''}`}>
            <div className="h-32 bg-gradient-to-br from-primary-900/40 to-slate-800 relative">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                <div className="absolute bottom-4 left-6">
                    <span className={`text-white text-[10px] font-bold uppercase px-3 py-1 rounded-full ${upcoming ? 'bg-emerald-600' : 'bg-slate-600'}`}>
                        {upcoming ? 'Upcoming' : 'Past'}
                    </span>
                </div>
            </div>
            <div className="p-6 space-y-4">
                <h3 className="text-xl font-bold text-white group-hover:text-primary-400 transition-colors">{event.title}</h3>
                <p className="text-slate-400 text-sm line-clamp-2">{event.description}</p>

                <div className="space-y-2 pt-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 text-sm text-slate-300">
                        <Clock size={16} className="text-primary-500" />
                        <span>{new Date(event.event_date).toLocaleDateString()} at {new Date(event.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-300">
                        <MapPin size={16} className="text-rose-500" />
                        <span>{event.location}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-400 font-bold">
                            {event.profiles?.full_name?.charAt(0) || '?'}
                        </div>
                        <span className="text-xs text-slate-500">By {event.profiles?.full_name}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
