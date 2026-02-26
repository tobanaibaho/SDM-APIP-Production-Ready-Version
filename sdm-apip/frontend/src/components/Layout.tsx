import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../assets/logo.png';
import {
    LayoutDashboard,
    Users,
    UserCog,
    LogOut,
    Menu,
    X,
    ClipboardCheck,
    CalendarDays,
    UserCircle2,
    Building2,
    FileText,
    ShieldCheck,
    Link2
} from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title, subtitle }) => {
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = isAdmin ? [
        { to: '/super-admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
        { to: '/super-admin/monitoring', label: 'Monitoring Penilaian', icon: ClipboardCheck },
        { to: '/super-admin/report', label: 'Laporan & Analitik', icon: FileText },
        { to: '/super-admin/sdm', label: 'Data SDM', icon: Building2 },
        { to: '/super-admin/groups', label: 'Manajemen Grup', icon: Users },
        { to: '/super-admin/cross-group-relations', label: 'Relasi Lintas Grup', icon: Link2 },
        { to: '/super-admin/users', label: 'Kelola Pengguna', icon: UserCog },
        { to: '/super-admin/periods', label: 'Periode Penilaian', icon: CalendarDays },
        { to: '/super-admin/audit-logs', label: 'Log Audit', icon: ShieldCheck },
    ] : [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
        { to: '/user/assessments', label: 'Penilaian 360', icon: ClipboardCheck },
        { to: '/my-groups', label: 'Grup Saya', icon: Users },
        { to: '/profile', label: 'Profil Saya', icon: UserCircle2 },
    ];

    return (
        <div className="flex min-h-screen bg-slate-100 font-sans">
            {/* Sidebar Desktop */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-72 bg-primary-900 border-r border-primary-800 text-white transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} shadow-xl
            `}>
                <div className="flex h-full flex-col">
                    {/* Sidebar Header */}
                    <div className="flex flex-col items-center justify-center px-6 py-8 border-b border-primary-800/50 bg-primary-950/20">
                        <div className="h-20 w-20 mb-4 bg-white rounded-full p-1 shadow-lg ring-4 ring-primary-700/30">
                            <img src={Logo} alt="Logo Kemenko" className="h-full w-full object-contain" />
                        </div>
                        <div className="text-center space-y-1">
                            <h2 className="text-sm font-bold tracking-wide text-white leading-tight uppercase">KEMENKO INFRASTRUKTUR</h2>
                            <p className="text-[10px] uppercase tracking-wider text-primary-200 font-medium opacity-80">& PEMBANGUNAN KEWILAYAHAN</p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1 px-3 py-6 overflow-y-auto">
                        <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-primary-400">
                            Menu Utama
                        </div>
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                className={({ isActive }: { isActive: boolean }) => `
                                    flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200
                                    ${isActive
                                        ? 'bg-accent-500 text-primary-950 shadow-md font-bold'
                                        : 'text-slate-300 hover:bg-primary-800 hover:text-white'} 
                                `}
                            >
                                {({ isActive }: { isActive: boolean }) => (
                                    <>
                                        <item.icon size={18} className={isActive ? "text-primary-900" : "text-primary-300"} />
                                        {item.label}
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Sidebar Footer */}
                    <div className="border-t border-primary-800 bg-primary-950/30 p-4">
                        <div className="flex items-center gap-3 rounded-lg bg-primary-800/40 p-3 border border-primary-700/30">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-500 font-bold text-primary-900 shadow-sm overflow-hidden border-2 border-primary-600">
                                {user?.foto ? (
                                    <img src={user.foto} alt="Profile" className="h-full w-full object-cover" />
                                ) : (
                                    user?.name?.charAt(0) || user?.nip?.slice(-1).toUpperCase() || 'U'
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-white">
                                    {isAdmin ? 'ADMINISTRATOR' : (user?.name || user?.nip)}
                                </p>
                                <p className="text-[10px] text-primary-300 uppercase tracking-wide font-medium">{isAdmin ? 'Pengelola Sistem' : 'Pegawai ASN'}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-bold text-red-200 transition-colors hover:bg-red-900/40 hover:text-red-100 uppercase tracking-wider border border-transparent hover:border-red-800/30"
                        >
                            <LogOut size={14} />
                            Keluar Aplikasi
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 w-full bg-white border-b border-slate-200 z-40 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <img src={Logo} alt="Logo" className="h-8 w-8" />
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm leading-none">SDM APIP</span>
                        <span className="text-[10px] text-slate-500 font-medium">INSPEKTORAT KEMENKO INFRA</span>
                    </div>
                </div>
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 rounded-md bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                >
                    {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden pt-16 lg:pt-0 bg-slate-100">
                {/* Scrollable Content Wrapper */}
                <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 lg:px-10">
                    <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center bg-white p-6 rounded-lg shadow-sm border border-slate-200/60 sticky top-0 z-10 backdrop-blur-xl bg-white/90 animate-fade-in">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-primary-900 md:text-3xl">{title}</h1>
                            {subtitle && <p className="mt-1 text-slate-500 text-sm font-medium">{subtitle}</p>}
                        </div>
                        <div className="hidden md:block">
                            <span className="text-xs font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded-full border border-primary-100 uppercase tracking-wider">
                                {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                        </div>
                    </div>

                    <div className="animate-slide-up">
                        {children}
                    </div>
                </div>
            </main>

            {/* Backdrop Mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
};

export default Layout;
