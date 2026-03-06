import React, { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { User, Mail, Shield, Edit3, Camera, Loader2, Save, X } from 'lucide-react'
import { moderateContent } from '../utils/moderation'

export default function Profile() {
    const { user, profile } = useAuth()
    const [editing, setEditing] = useState(false)
    const [fullName, setFullName] = useState(profile?.full_name || '')
    const [loading, setLoading] = useState(false)
    const [avatarLoading, setAvatarLoading] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null)
    const fileInputRef = useRef(null)

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        if (file.size > 2 * 1024 * 1024) {
            alert('Image must be less than 2MB')
            return
        }

        setAvatarLoading(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}-${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName)

            // Update profile with new avatar URL
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id)

            if (updateError) throw updateError

            setAvatarUrl(publicUrl)
            alert('Avatar updated! Refresh the page to see it everywhere.')
        } catch (err) {
            alert('Upload failed: ' + err.message)
        } finally {
            setAvatarLoading(false)
        }
    }

    const handleUpdate = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Moderate full name
            const result = await moderateContent(fullName, 'profile', user.id)
            if (result.flagged) {
                alert('🚫 Profile update blocked by AI. Your name contains inappropriate content.')
                setLoading(false)
                return
            }

            const { error } = await supabase
                .from('profiles')
                .update({ full_name: fullName })
                .eq('id', user.id)

            if (error) throw error

            setEditing(false)
            alert('Profile updated! Refresh the page to see changes.')
        } catch (err) {
            alert(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Profile Header */}
            <div className="glass-card bg-slate-900 border-slate-800 p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary-600/20 to-purple-600/20" />

                <div className="relative pt-12 flex flex-col md:flex-row items-center gap-8">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-3xl bg-slate-800 border-4 border-slate-900 overflow-hidden shadow-2xl flex items-center justify-center text-slate-500">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <User size={64} />
                            )}
                            {avatarLoading && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-3xl">
                                    <Loader2 size={32} className="animate-spin text-primary-500" />
                                </div>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleAvatarUpload}
                            accept="image/*"
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-2 right-2 p-2 bg-primary-600 text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-primary-500"
                        >
                            <Camera size={16} />
                        </button>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-3xl font-bold text-white">{profile?.full_name}</h2>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2">
                            <div className="flex items-center gap-2 text-slate-400 text-sm bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700">
                                <Shield size={14} className="text-primary-500" />
                                <span className="capitalize">{profile?.role}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 text-sm bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700">
                                <Mail size={14} />
                                <span>{user?.email}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setEditing(!editing)}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-slate-700"
                    >
                        {editing ? <><X size={18} /> Cancel</> : <><Edit3 size={18} /> Edit Profile</>}
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    {editing ? (
                        <div className="glass-card p-8 bg-slate-900 border-slate-800">
                            <h3 className="text-xl font-bold text-white mb-6">Edit Profile Details</h3>
                            <form onSubmit={handleUpdate} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Full Name</label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all border"
                                    />
                                </div>
                                <button
                                    disabled={loading}
                                    className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 rounded-xl mt-4 shadow-lg shadow-primary-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : <><Save size={18} /> Save Changes</>}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="glass-card p-8 bg-slate-900 border-slate-800">
                            <h3 className="text-xl font-bold text-white mb-6">User Statistics</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                                    <p className="text-slate-500 text-xs font-bold uppercase mb-1">Posts</p>
                                    <p className="text-2xl font-bold text-white">12</p>
                                </div>
                                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                                    <p className="text-slate-500 text-xs font-bold uppercase mb-1">Impact Score</p>
                                    <p className="text-2xl font-bold text-emerald-500">840</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="glass-card p-6 bg-slate-900 border-slate-800">
                        <h3 className="text-lg font-bold text-white mb-4">Account Security</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Two-Factor Auth</span>
                                <span className="text-rose-500 font-bold">Disabled</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Login Emails</span>
                                <span className="text-emerald-500 font-bold">Enabled</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
