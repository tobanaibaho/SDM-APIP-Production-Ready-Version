import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLiveClock } from '../hooks/useRelativeTime';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../services/authService';
import Logo from '../assets/logo.png';
import toast from 'react-hot-toast';
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
    Link2,
    KeyRound,
    Eye,
    EyeOff,
    Loader2,
    Power,
    ChevronUp,
    ChevronDown,
    ArrowLeft,
    List,
} from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title, subtitle }) => {
    const clock = useLiveClock();
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
    const [showPw, setShowPw] = useState({ current: false, new_pw: false, confirm: false });
    const [pwLoading, setPwLoading] = useState(false);

    const settingsRef = useRef<HTMLDivElement>(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [showScrollBottom, setShowScrollBottom] = useState(false);

    const handleScroll = useCallback(() => {
        const scrollY = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        setShowScrollTop(scrollY > 250);
        setShowScrollBottom(docHeight > 200 && scrollY < docHeight - 150);
    }, []);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
                setShowSettingsMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pwForm.new_password !== pwForm.confirm_password) {
            toast.error('Password baru dan konfirmasi tidak cocok');
            return;
        }
        setPwLoading(true);
        try {
            await changePassword(pwForm, isAdmin);
            toast.success('Password berhasil diubah! Silakan login ulang.');
            setShowChangePassword(false);
            setPwForm({ current_password: '', new_password: '', confirm_password: '' });
            setTimeout(() => { logout(); navigate(isAdmin ? '/super-admin/login' : '/login'); }, 1500);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Gagal mengubah password');
        } finally {
            setPwLoading(false);
        }
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
        { to: '/super-admin/questions', label: 'Kuesioner Dinamis', icon: List },
        { to: '/super-admin/audit-logs', label: 'Log Audit', icon: ShieldCheck },
    ] : [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
        { to: '/user/assessments', label: 'Penilaian 360', icon: ClipboardCheck },
        { to: '/my-groups', label: 'Grup Saya', icon: Users },
        { to: '/profile', label: 'Profil Saya', icon: UserCircle2 },
    ];

    const isRootPage = navItems.some(item => pathname === item.to);

    return (
        <div className="flex min-h-screen bg-transparent font-sans relative overflow-hidden">
            {/* Animated Background Blobs for Glassmorphism Effect */}
            {/* Highly Subdued Background for elegance */}
            <div className="absolute top-[-5%] left-[-5%] w-72 h-72 bg-slate-200 rounded-full mix-blend-multiply filter blur-[120px] opacity-20 pointer-events-none z-0"></div>
            <div className="absolute bottom-[-5%] right-[-5%] w-72 h-72 bg-slate-200 rounded-full mix-blend-multiply filter blur-[120px] opacity-20 pointer-events-none z-0"></div>

            {/* Sidebar Desktop */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-72 bg-primary-950 border-r border-primary-800 text-white transition-transform duration-300 ease-in-out lg:translate-x-0
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} shadow-[4px_0_24px_rgba(0,0,0,0.3)]
            `}>
                <div className="flex h-full flex-col w-full">
                    {/* Sidebar Header */}
                    <div className="flex border-b border-primary-800/50 bg-primary-950/20 px-6 py-4 items-center gap-3">
                        <div className="h-14 w-14 shrink-0 drop-shadow-md">
                            <img src={Logo} alt="Logo Kemenko" className="h-full w-full object-contain" />
                        </div>
                        <div className="space-y-0.5">
                            <h2 className="text-sm font-black tracking-widest text-white leading-tight uppercase">INSPEKTORAT</h2>
                            <p className="text-xs uppercase tracking-widest text-primary-200 font-bold opacity-90">KEMENKO INFRA</p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
                        <div className="mb-4 px-2 text-xs font-black uppercase tracking-widest text-primary-300/90 shadow-sm-text">
                            Menu Utama
                        </div>
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                className={({ isActive }: { isActive: boolean }) => `
                                    flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition-all duration-300 relative group
                                    ${isActive
                                        ? 'bg-primary-600 text-white shadow-lg'
                                        : 'text-primary-100 hover:bg-primary-800 hover:text-white'} 
                                `}
                            >
                                {({ isActive }: { isActive: boolean }) => (
                                    <>
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1.5 bg-sky-400 rounded-r-full shadow-[0_0_15px_rgba(56,189,248,0.6)]"></div>
                                        )}
                                        <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-primary-500 text-white' : 'bg-transparent text-primary-300 group-hover:bg-primary-700 group-hover:text-white'}`}>
                                            <item.icon size={20} strokeWidth={2.5} />
                                        </div>
                                        <span className={isActive ? "font-black tracking-wide" : "font-bold tracking-wide"}>{item.label}</span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Sidebar Footer */}
                    <div className="border-t border-primary-800/50 bg-primary-950/40 p-5 relative" ref={settingsRef}>
                        <div className="flex items-center justify-between gap-2 rounded-lg bg-primary-800/40 p-3 border border-primary-700/30">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-500 font-bold text-primary-900 shadow-sm overflow-hidden border-2 border-primary-600">
                                    {user?.foto ? (
                                        <img src={user.foto} alt="Profile" className="h-full w-full object-cover" />
                                    ) : (
                                        user?.name?.charAt(0).toUpperCase() || user?.nip?.slice(-1).toUpperCase() || 'U'
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-black text-white tracking-wide">
                                        {isAdmin ? 'ADMINISTRATOR' : (user?.name || user?.nip)}
                                    </p>
                                    <p className="text-xs text-primary-200 uppercase tracking-widest font-bold mt-0.5">{isAdmin ? 'Pengelola Sistem' : (user?.role || 'Pegawai ASN')}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                                className={`h-8 w-8 shrink-0 flex items-center justify-center rounded-md transition-all ${showSettingsMenu ? 'bg-primary-600 text-white' : 'bg-primary-700/50 text-slate-300 hover:bg-primary-600 hover:text-white'}`}
                            >
                                <Power size={16} />
                            </button>
                        </div>

                        {/* Settings Pop-up */}
                        <div className={`
                            absolute bottom-2 left-full ml-4 w-52 bg-slate-800/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden z-50 transition-all duration-300 origin-left
                            ${showSettingsMenu ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-95 -translate-x-4 pointer-events-none'}
                        `}>
                            <div className="p-1.5 flex flex-col gap-1">
                                <button
                                    onClick={() => { setShowChangePassword(true); setShowSettingsMenu(false); }}
                                    className="flex w-full items-center gap-3 px-3 py-2.5 text-xs font-semibold text-slate-300 rounded-lg transition-colors hover:bg-slate-700/50 hover:text-white"
                                >
                                    <div className="h-6 w-6 rounded-md bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                        <KeyRound size={12} className="text-blue-400" />
                                    </div>
                                    Ganti Password
                                </button>
                                <button
                                    onClick={() => { handleLogout(); setShowSettingsMenu(false); }}
                                    className="flex w-full items-center gap-3 px-3 py-2.5 text-xs font-semibold text-slate-300 rounded-lg transition-colors hover:bg-red-500/10 hover:text-red-400"
                                >
                                    <div className="h-6 w-6 rounded-md bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                        <LogOut size={12} className="text-red-400" />
                                    </div>
                                    Keluar Sesi
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 w-full bg-white/60 backdrop-blur-md border-b border-white/40 z-40 px-4 py-3 flex items-center justify-between shadow-sm">
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
            <main className="flex-1 flex flex-col min-h-screen pt-16 lg:pt-0 lg:ml-72 bg-transparent w-full lg:w-[calc(100%-18rem)] relative z-10">
                {/* Content Wrapper */}
                <div className="flex-1 px-4 py-6 md:px-8 md:py-8 lg:px-10 w-full max-w-[1600px] mx-auto">
                    <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center bg-white/40 backdrop-blur-md p-5 md:p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 sticky top-[72px] lg:top-4 z-30 animate-fade-in">
                        <div className="flex items-center gap-4">
                            {!isRootPage && (
                                <button
                                    onClick={() => navigate(-1)}
                                    className="shrink-0 h-10 w-10 md:h-12 md:w-12 flex items-center justify-center rounded-2xl bg-white/50 backdrop-blur-sm border border-white/60 text-slate-500 hover:bg-white/80 hover:text-primary-600 hover:shadow-md transition-all active:scale-95"
                                    title="Kembali ke halaman sebelumnya"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                            )}
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">{title}</h1>
                                {subtitle && <p className="mt-1 text-slate-500 text-sm font-medium">{subtitle}</p>}
                            </div>
                        </div>
                        <div className="hidden md:flex items-center gap-3 shrink-0">
                            <div className="flex flex-col items-end">
                                <span className="text-xs font-black text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 uppercase tracking-wider whitespace-nowrap">
                                    {clock.date}
                                </span>
                                <span className="text-[11px] font-mono font-bold text-slate-400 mt-1 pr-1 tracking-widest">
                                    {clock.time}
                                </span>
                            </div>
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

            {/* ══ Floating Scroll Buttons (Global) ══ */}
            <div className="fixed bottom-6 right-6 z-[9990] flex flex-col gap-2">
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className={`flex items-center justify-center h-10 w-10 rounded-xl bg-slate-800/90 backdrop-blur-sm text-white shadow-xl border border-slate-600/60 transition-all duration-300 hover:scale-110 hover:bg-primary-600 active:scale-95 ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
                    title="Ke paling atas"
                >
                    <ChevronUp size={18} />
                </button>
                <button
                    onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })}
                    className={`flex items-center justify-center h-10 w-10 rounded-xl bg-slate-800/90 backdrop-blur-sm text-white shadow-xl border border-slate-600/60 transition-all duration-300 hover:scale-110 hover:bg-primary-600 active:scale-95 ${showScrollBottom ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
                    title="Ke paling bawah"
                >
                    <ChevronDown size={18} />
                </button>
            </div>

            {/* Modal Ganti Password */}
            {showChangePassword && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="w-full max-w-md bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 animate-fade-in">
                        <div className="flex items-center justify-between p-6 border-b border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                    <KeyRound size={20} className="text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Ganti Password</h2>
                                    <p className="text-xs text-slate-400">Password lama diperlukan untuk verifikasi</p>
                                </div>
                            </div>
                            <button onClick={() => setShowChangePassword(false)} className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleChangePassword} className="p-6 space-y-4">
                            {/* Password Lama */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Password Saat Ini</label>
                                <div className="relative">
                                    <input
                                        id="current_password"
                                        name="current_password"
                                        type={showPw.current ? 'text' : 'password'}
                                        value={pwForm.current_password}
                                        onChange={e => setPwForm(p => ({ ...p, current_password: e.target.value }))}
                                        required
                                        placeholder="Masukkan password saat ini"
                                        className="w-full pr-10 pl-4 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                    <button type="button" onClick={() => setShowPw(p => ({ ...p, current: !p.current }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                                        {showPw.current ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            {/* Password Baru */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Password Baru</label>
                                <div className="relative">
                                    <input
                                        id="new_password"
                                        name="new_password"
                                        type={showPw.new_pw ? 'text' : 'password'}
                                        value={pwForm.new_password}
                                        onChange={e => setPwForm(p => ({ ...p, new_password: e.target.value }))}
                                        required
                                        placeholder="Min. 8 karakter, huruf besar, angka, simbol"
                                        className="w-full pr-10 pl-4 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                    <button type="button" onClick={() => setShowPw(p => ({ ...p, new_pw: !p.new_pw }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                                        {showPw.new_pw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            {/* Konfirmasi Password */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Konfirmasi Password Baru</label>
                                <div className="relative">
                                    <input
                                        id="confirm_password"
                                        name="confirm_password"
                                        type={showPw.confirm ? 'text' : 'password'}
                                        value={pwForm.confirm_password}
                                        onChange={e => setPwForm(p => ({ ...p, confirm_password: e.target.value }))}
                                        required
                                        placeholder="Ulangi password baru"
                                        className={`w-full pr-10 pl-4 py-2.5 bg-slate-800 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 text-sm ${pwForm.confirm_password && pwForm.new_password !== pwForm.confirm_password
                                            ? 'border-red-500 focus:ring-red-500'
                                            : 'border-slate-600 focus:ring-blue-500'
                                            }`}
                                    />
                                    <button type="button" onClick={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                                        {showPw.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {pwForm.confirm_password && pwForm.new_password !== pwForm.confirm_password && (
                                    <p className="text-red-400 text-xs mt-1">Password tidak cocok</p>
                                )}
                            </div>

                            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                <p className="text-yellow-300 text-xs">⚠️ Setelah password diubah, Anda akan otomatis logout dan harus login ulang dengan password baru.</p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowChangePassword(false)} className="flex-1 py-2.5 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors text-sm font-semibold">
                                    Batal
                                </button>
                                <button type="submit" disabled={pwLoading} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-semibold flex items-center justify-center gap-2">
                                    {pwLoading ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : 'Simpan Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Layout;
