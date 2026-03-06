import React, { useState, useEffect } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
    LayoutDashboard, MessageSquare, Calendar, User, LogOut,
    ShieldCheck, Home, Users, Sun, Moon, PackageSearch,
    Building, Trash2, Menu, X, ChevronRight, Bell, MessageCircle
} from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import Chatbot from './Chatbot'

function cn(...inputs) {
    return twMerge(clsx(inputs))
}

const SidebarLink = ({ to, icon: Icon, label, active, onClick }) => (
    <Link
        to={to}
        onClick={onClick}
        className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group",
            active
                ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20"
                : "text-[var(--text-muted)] hover:bg-primary-500/10 hover:text-primary-500"
        )}
    >
        <Icon size={20} className={cn("transition-transform duration-300", active ? "scale-110" : "group-hover:scale-110")} />
        <span className="font-medium flex-1">{label}</span>
        {active && <ChevronRight size={14} className="opacity-50" />}
    </Link>
)

export default function Layout() {
    const { signOut, isAdmin, profile } = useAuth()
    const { theme, toggleTheme } = useTheme()
    const navigate = useNavigate()
    const location = useLocation()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    // Close mobile menu on navigation
    useEffect(() => {
        setIsMobileMenuOpen(false)
    }, [location.pathname])

    const handleLogout = async () => {
        await signOut()
        navigate('/login')
    }

    const menuItems = [
        { to: '/', icon: Home, label: 'Feed' },
        { to: '/forums', icon: Building, label: 'Forums' },
        { to: '/events', icon: Calendar, label: 'Events' },
        { to: '/communities', icon: Users, label: 'Communities' },
        { to: '/lost-found', icon: PackageSearch, label: 'Lost & Found' },
        { to: '/chat', icon: MessageCircle, label: 'Group Chat' },
        { to: '/profile', icon: User, label: 'Profile' },
    ]

    if (isAdmin) {
        menuItems.push({ to: '/admin', icon: ShieldCheck, label: 'Admin Panel' })
    }

    const SidebarContent = () => (
        <div className="flex flex-col gap-8 h-full">
            <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-primary-600/20">
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
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                ))}
            </nav>

            <div className="pt-6 border-t border-[var(--card-border)] space-y-2">
                <button
                    onClick={toggleTheme}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-muted)] hover:bg-primary-500/10 hover:text-primary-500 transition-all w-full mb-2 group"
                >
                    {theme === 'light' ? <Moon size={20} className="group-hover:rotate-12 transition-transform" /> : <Sun size={20} className="group-hover:rotate-45 transition-transform" />}
                    <span className="font-medium">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                </button>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-muted)] hover:bg-rose-500/10 hover:text-rose-500 transition-all w-full group"
                >
                    <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </div>
    )

    return (
        <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-400">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-72 border-r border-[var(--card-border)] p-8 flex-col sticky top-0 h-screen bg-[var(--background)] z-50">
                <SidebarContent />
            </aside>

            {/* Mobile Drawer */}
            <div className={cn(
                "fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 lg:hidden",
                isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )} onClick={() => setIsMobileMenuOpen(false)}>
                <aside
                    className={cn(
                        "w-72 bg-[var(--background)] h-full p-8 transition-transform duration-500 ease-out",
                        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                    )}
                    onClick={e => e.stopPropagation()}
                >
                    <SidebarContent />
                </aside>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Responsive Header */}
                <header className="sticky top-0 z-40 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--card-border)] p-4 lg:p-6 lg:border-none lg:bg-transparent">
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="lg:hidden p-2 hover:bg-[var(--input-bg)] rounded-xl text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
                            >
                                <Menu size={24} />
                            </button>
                            <div className="lg:block">
                                <h1 className="text-xl lg:text-3xl font-bold tracking-tight text-[var(--foreground)] truncate">
                                    {location.pathname === '/' ? 'Home Feed' : location.pathname.split('/')[1].replace('-', ' ')}
                                </h1>
                                <p className="hidden sm:block text-[var(--text-muted)] text-sm font-medium mt-1">
                                    Hello, {profile?.full_name?.split(' ')?.[0] || 'Member'} — welcome back!
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 lg:gap-6">
                            <button className="p-2.5 text-[var(--text-muted)] hover:text-primary-500 hover:bg-primary-500/10 rounded-xl transition-all relative">
                                <Bell size={20} />
                                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary-500 rounded-full border-2 border-[var(--background)]"></span>
                            </button>

                            <div className="flex items-center gap-3 pl-2 lg:pl-6 border-l border-[var(--card-border)]">
                                <div className="hidden md:block text-right">
                                    <p className="text-sm font-bold text-[var(--foreground)] leading-tight">{profile?.full_name}</p>
                                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold mt-0.5">{profile?.role}</p>
                                </div>
                                <Link to="/profile" className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-[var(--input-bg)] border-2 border-[var(--card-border)] overflow-hidden hover:border-primary-500 transition-colors shadow-sm">
                                    {profile?.avatar_url ? (
                                        <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                                            <User size={20} />
                                        </div>
                                    )}
                                </Link>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 px-4 py-6 lg:p-8 max-w-7xl mx-auto w-full animate-fade-in">
                    <Outlet />
                </main>
                <Chatbot />
            </div>
        </div>
    )
}
