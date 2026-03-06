import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { User, Mail, Shield, Edit3, Camera, Loader2, Save, X, GraduationCap, Award, MapPin, Calendar } from 'lucide-react'
import { moderateContent } from '../utils/moderation'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs) {
    return twMerge(clsx(inputs))
}

export default function Profile() {
    const { user, profile, refreshProfile } = useAuth()
    const [editing, setEditing] = useState(false)
    const [fullName, setFullName] = useState(profile?.full_name || '')
    const [department, setDepartment] = useState(profile?.department || '')
    const [loading, setLoading] = useState(false)
    const [avatarLoading, setAvatarLoading] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null)
    const fileInputRef = useRef(null)


    useEffect(() => {
    }, [profile])


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

        // Email Domain Validation
        if (!user.email.endsWith('@hicas.ac.in')) {
            alert('🚫 Access Restricted: Only @hicas.ac.in email addresses can update profiles or use platform features.')
            return
        }

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
                .update({
                    full_name: fullName,
                    department: department
                })
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

    const handleRoleChange = async (newRole) => {
        if (!window.confirm(`Are you sure you want to change your role to ${newRole}?`)) return
        setLoading(true)
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', user.id)
            if (error) throw error
            alert('Role updated! You are now an Alumni.')
            refreshProfile()
        } catch (err) {
            alert(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-10">
            {/* Profile Hero Header */}
            <div className="glass-card bg-[var(--card-bg)] border-[var(--card-border)] p-0 overflow-hidden shadow-2xl animate-fade-in">
                {/* Banner Area */}
                <div className="h-48 bg-gradient-to-br from-primary-600/40 via-primary-900/40 to-[var(--card-bg)] relative">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.1),transparent)]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--card-bg)] to-transparent" />
                </div>

                <div className="px-8 pb-10 -mt-20">
                    <div className="flex flex-col md:flex-row items-end gap-8">
                        {/* Avatar Section */}
                        <div className="relative group shrink-0">
                            <div className="w-40 h-40 rounded-[2.5rem] bg-[var(--input-bg)] border-8 border-[var(--card-bg)] overflow-hidden shadow-2xl flex items-center justify-center text-[var(--text-muted)] ring-1 ring-[var(--card-border)]">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                ) : (
                                    <User size={80} className="opacity-20" />
                                )}
                                {avatarLoading && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                        <Loader2 size={40} className="animate-spin text-primary-500" />
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
                                className="absolute bottom-4 right-4 p-3 bg-primary-600 text-white rounded-2xl shadow-xl ring-4 ring-[var(--card-bg)] hover:bg-primary-500 transition-all hover:scale-110 active:scale-95"
                                title="Change Avatar"
                            >
                                <Camera size={18} className="stroke-[2.5]" />
                            </button>
                        </div>

                        {/* Name & Bio Area */}
                        <div className="flex-1 pb-4 text-center md:text-left">
                            <div className="flex flex-col md:flex-row md:items-center gap-3">
                                <h2 className="text-4xl lg:text-5xl font-black text-[var(--foreground)] tracking-tighter drop-shadow-sm">{profile?.full_name}</h2>
                                <div className="flex items-center justify-center md:justify-start gap-2">
                                    <span className="bg-primary-500/10 text-primary-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-primary-500/10">
                                        Verified {profile?.role}
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-wrap justify-center md:justify-start gap-5 mt-4">
                                <div className="flex items-center gap-2 text-[var(--text-muted)] font-bold text-sm">
                                    <Mail size={16} className="text-primary-500" />
                                    <span>{user?.email}</span>
                                </div>
                                {profile?.department && (
                                    <div className="flex items-center gap-2 text-[var(--text-muted)] font-bold text-sm">
                                        <GraduationCap size={16} className="text-rose-500" />
                                        <span>{profile.department}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions Area */}
                        <div className="flex flex-col sm:flex-row gap-3 pb-4 w-full md:w-auto">
                            {profile?.role === 'student' && (
                                <button
                                    onClick={() => handleRoleChange('alumni')}
                                    className="flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white rounded-2xl font-black text-xs transition-all border border-emerald-500/10 uppercase tracking-widest shadow-sm shadow-emerald-500/5 group"
                                >
                                    <GraduationCap size={16} className="group-hover:rotate-12 transition-transform" />
                                    <span>Graduated</span>
                                </button>
                            )}
                            <button
                                onClick={() => setEditing(!editing)}
                                className={cn(
                                    "flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-black text-xs transition-all border uppercase tracking-widest shadow-sm",
                                    editing
                                        ? "bg-rose-500/10 text-rose-500 border-rose-500/10 hover:bg-rose-500 hover:text-white"
                                        : "bg-[var(--foreground)] text-[var(--card-bg)] border-[var(--foreground)] hover:opacity-90"
                                )}
                            >
                                {editing ? <><X size={16} /> <span>Cancel</span></> : <><Edit3 size={16} /> <span>Edit Profile</span></>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10 animate-fade-in-up">
                <div className="lg:col-span-2 space-y-8">
                    {editing ? (
                        <div className="glass-card p-8 lg:p-12 bg-[var(--card-bg)] border-[var(--card-border)] shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <Edit3 size={120} />
                            </div>
                            <div className="relative">
                                <h3 className="text-3xl font-black text-[var(--foreground)] mb-2 tracking-tight">Edit Identity</h3>
                                <p className="text-[var(--text-muted)] font-medium mb-10">Keep your details updated for the community</p>

                                <form onSubmit={handleUpdate} className="space-y-8">
                                    <div className="space-y-3">
                                        <label className="text-[11px] font-black text-primary-600 uppercase tracking-[0.2em] pl-1">Full Name</label>
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="input-style w-full px-6 py-4.5 text-lg"
                                            placeholder="Your Display Name"
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[11px] font-black text-primary-600 uppercase tracking-[0.2em] pl-1">Primary Department</label>
                                        <select
                                            value={department}
                                            onChange={(e) => setDepartment(e.target.value)}
                                            className="input-style w-full px-6 py-4.5 text-lg appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJtNiA5IDYgNiA2LTYiLz48L3N2Zz4=')] bg-[length:1.5rem] bg-[right_1.5rem_center] bg-no-repeat"
                                        >
                                            <option value="">Select Department</option>
                                            <option value="Computer Science">Computer Science & IT</option>
                                            <option value="Information Tech">Information Technology</option>
                                            <option value="Mechanical Eng">Mechanical Engineering</option>
                                            <option value="Civil Eng">Civil Engineering</option>
                                            <option value="Electronics & Comm">Electronics & Communication</option>
                                            <option value="Electrical Eng">Electrical Engineering</option>
                                        </select>
                                        <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-wider mt-2 opacity-60">* This determines your access to specialized departmental forum feeds.</p>
                                    </div>

                                    <button
                                        disabled={loading}
                                        className="w-full bg-primary-600 hover:bg-primary-500 text-white font-black py-5 rounded-[2rem] mt-6 shadow-2xl shadow-primary-600/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 text-lg uppercase tracking-widest"
                                    >
                                        {loading ? <><Loader2 size={24} className="animate-spin" /> <span>Syncing...</span></> : <><Save size={24} /> <span>Save Profile</span></>}
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Stats Overview */}
                            <div className="glass-card p-10 bg-[var(--card-bg)] border-[var(--card-border)] shadow-xl">
                                <h3 className="text-2xl font-black text-[var(--foreground)] mb-8 tracking-tight flex items-center gap-3">
                                    <Award size={24} className="text-primary-500" />
                                    <span>Contribution Hub</span>
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="bg-gradient-to-br from-[var(--input-bg)] to-[var(--card-bg)] p-8 rounded-[2rem] border border-[var(--card-border)] shadow-inner group hover:border-primary-500/30 transition-colors">
                                        <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-[0.2em] mb-3">Total Activity</p>
                                        <div className="flex items-center justify-between">
                                            <p className="text-5xl font-black text-[var(--foreground)] group-hover:text-primary-600 transition-colors">12</p>
                                            <div className="w-14 h-14 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-500">
                                                <Edit3 size={28} />
                                            </div>
                                        </div>
                                        <p className="text-xs font-bold text-[var(--text-muted)] mt-4">Posts shared with community</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-[var(--input-bg)] to-[var(--card-bg)] p-8 rounded-[2rem] border border-[var(--card-border)] shadow-inner group hover:border-emerald-500/30 transition-colors">
                                        <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-[0.2em] mb-3">Global Impact</p>
                                        <div className="flex items-center justify-between">
                                            <p className="text-5xl font-black text-emerald-500">840</p>
                                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                                <Award size={28} />
                                            </div>
                                        </div>
                                        <p className="text-xs font-bold text-[var(--text-muted)] mt-4">Calculated from peer engagement</p>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity Placeholder */}
                            <div className="glass-card p-8 bg-[var(--card-bg)] border-[var(--card-border)] border-dashed opacity-50 flex flex-col items-center justify-center text-center py-16">
                                <Calendar size={48} className="text-[var(--text-muted)] mb-4" />
                                <h4 className="text-lg font-black text-[var(--foreground)]">Activity Log Coming Soon</h4>
                                <p className="text-sm text-[var(--text-muted)] max-w-xs mt-2">We're building a detailed history of your interactions within the HICAS community.</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-8">
                    {/* Security Card */}
                    <div className="glass-card p-8 bg-[var(--card-bg)] border-[var(--card-border)] shadow-xl relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Shield size={120} />
                        </div>
                        <h3 className="text-xl font-black text-[var(--foreground)] mb-6 tracking-tight uppercase tracking-widest text-sm">Vault Status</h3>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--input-bg)] border border-[var(--card-border)]">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse" />
                                    <span className="text-xs font-bold text-[var(--text-muted)]">2FA Shield</span>
                                </div>
                                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 px-2 py-1 rounded">Inactive</span>
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--input-bg)] border border-[var(--card-border)]">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                                    <span className="text-xs font-bold text-[var(--text-muted)]">Audit Logs</span>
                                </div>
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded">Active</span>
                            </div>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] mt-6 font-medium italic opacity-60">Security features are managed by the HICAS Central Admin panel.</p>
                    </div>

                    {/* Quick Links Card */}
                    <div className="glass-card p-8 bg-primary-600 text-white shadow-2xl shadow-primary-600/20 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                        <div className="absolute -left-4 -bottom-4 opacity-10">
                            <GraduationCap size={140} />
                        </div>
                        <h3 className="text-xl font-black mb-4 relative z-10">Network Hub</h3>
                        <p className="text-primary-100 text-sm font-medium mb-6 relative z-10 leading-relaxed">Join departmental forums or participate in upcoming events to boost your impact score.</p>
                        <button className="w-full bg-white text-primary-600 font-black py-4 rounded-2xl text-xs uppercase tracking-widest relative z-10 shadow-lg active:scale-95 transition-all">
                            Explore Hub
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
