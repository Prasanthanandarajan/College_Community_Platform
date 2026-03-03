import React from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { LayoutDashboard, MessageSquare, Calendar, User, LogOut, ShieldCheck, Home, Users, Sun, Moon } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import Chatbot from './Chatbot'

function cn(...inputs) {
    return twMerge(clsx(inputs))
}

const SidebarLink = ({ to, icon: Icon, label, active }) => (
    <Link
        to={to}
        className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
            active
                ? "bg-primary-600 text-white shadow-lg shadow-primary-500/30"
                : "text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--foreground)]"
        )}
    >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
    </Link>
)

export default function Layout() {
    const { signOut, isAdmin, profile } = useAuth()
    const { theme, toggleTheme } = useTheme()
    const navigate = useNavigate()
    const location = useLocation()

    const handleLogout = async () => {
        await signOut()
        navigate('/login')
    }

    const menuItems = [
        { to: '/', icon: Home, label: 'Feed' },
        { to: '/chat', icon: MessageSquare, label: 'Chat' },
        { to: '/events', icon: Calendar, label: 'Events' },
        { to: '/communities', icon: Users, label: 'Communities' },
        { to: '/profile', icon: User, label: 'Profile' },
    ]

    if (isAdmin) {
        menuItems.push({ to: '/admin', icon: ShieldCheck, label: 'Admin Panel' })
    }

    return (
        <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
            {/* Sidebar */}
            <aside className="w-64 border-r border-[var(--card-border)] p-6 flex flex-col gap-8 sticky top-0 h-screen bg-[var(--background)]">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-primary-500/20">
                        C
                    </div>
                    <span className="text-xl font-bold tracking-tight text-[var(--foreground)]">CollegeCommunity</span>
                </div>

                <nav className="flex-1 flex flex-col gap-2">
                    {menuItems.map((item) => (
                        <SidebarLink
                            key={item.to}
                            {...item}
                            active={location.pathname === item.to}
                        />
                    ))}
                </nav>

                <div className="pt-6 border-t border-[var(--card-border)] space-y-2">
                    <button
                        onClick={toggleTheme}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-muted)] hover:bg-primary-500/10 hover:text-primary-500 transition-all w-full mb-2"
                    >
                        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                        <span className="font-medium">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-muted)] hover:bg-rose-500/10 hover:text-rose-500 transition-all w-full"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto relative">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--foreground)] capitalize">
                            {location.pathname === '/' ? 'Home Feed' : location.pathname.split('/')[1]}
                        </h1>
                        <p className="text-[var(--text-muted)] text-sm">Welcome back, {profile?.full_name || 'Student'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm font-medium text-[var(--foreground)]">{profile?.full_name}</p>
                            <p className="text-xs text-[var(--text-muted)] capitalize">{profile?.role}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[var(--input-bg)] border border-[var(--card-border)] overflow-hidden">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                                    <User size={20} />
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <Outlet />
                <Chatbot />
            </main>
        </div>
    )
}
