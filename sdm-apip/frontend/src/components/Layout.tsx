import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { changeAdminPassword } from '../services/authService';
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
    Power
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
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
    const [showPw, setShowPw] = useState({ current: false, new_pw: false, confirm: false });
    const [pwLoading, setPwLoading] = useState(false);

    const settingsRef = useRef<HTMLDivElement>(null);

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
            await changeAdminPassword(pwForm);
            toast.success('Password berhasil diubah! Silakan login ulang.');
            setShowChangePassword(false);
            setPwForm({ current_password: '', new_password: '', confirm_password: '' });
            setTimeout(() => { logout(); navigate('/super-admin/login'); }, 1500);
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
                fixed inset-y-0 left-0 z-50 w-72 bg-primary-900 border-r border-primary-800 text-white transition-transform duration-300 ease-in-out lg:translate-x-0
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} shadow-xl
            `}>
                <div className="flex h-full flex-col w-full overflow-hidden">
                    {/* Sidebar Header */}
                    <div className="flex border-b border-primary-800/50 bg-primary-950/20 px-6 py-4 items-center gap-3">
                        <div className="h-14 w-14 shrink-0 drop-shadow-md">
                            <img src={Logo} alt="Logo Kemenko" className="h-full w-full object-contain" />
                        </div>
                        <div className="space-y-0.5">
                            <h2 className="text-sm font-bold tracking-wide text-white leading-tight uppercase">INSPEKTORAT</h2>
                            <p className="text-[10px] uppercase tracking-wider text-primary-200 font-medium opacity-80">KEMENKO INFRA</p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
                        <div className="mb-4 px-2 text-[10px] font-black uppercase tracking-widest text-primary-400/80">
                            Menu Utama
                        </div>
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                className={({ isActive }: { isActive: boolean }) => `
                                    flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-300 relative group
                                    ${isActive
                                        ? 'bg-accent-500/10 text-accent-400'
                                        : 'text-slate-300 hover:bg-primary-800/50 hover:text-white'} 
                                `}
                            >
                                {({ isActive }: { isActive: boolean }) => (
                                    <>
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-accent-400 rounded-r-full shadow-[0_0_10px_rgba(251,191,36,0.5)]"></div>
                                        )}
                                        <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-accent-500/20 text-accent-400' : 'bg-transparent text-primary-300 group-hover:bg-primary-700 group-hover:text-white'}`}>
                                            <item.icon size={18} />
                                        </div>
                                        <span className={isActive ? "font-bold tracking-wide" : "tracking-wide"}>{item.label}</span>
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
                                    <p className="truncate text-sm font-bold text-white">
                                        {isAdmin ? 'ADMINISTRATOR' : (user?.name || user?.nip)}
                                    </p>
                                    <p className="text-[10px] text-primary-300 uppercase tracking-wide font-medium">{isAdmin ? 'Pengelola Sistem' : (user?.role || 'Pegawai ASN')}</p>
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
                            absolute bottom-full left-4 right-4 mb-2 bg-slate-800/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden z-50 transition-all duration-300 origin-bottom
                            ${showSettingsMenu ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'}
                        `}>
                            <div className="p-1.5 flex flex-col gap-1">
                                {isAdmin && (
                                    <button
                                        onClick={() => { setShowChangePassword(true); setShowSettingsMenu(false); }}
                                        className="flex w-full items-center gap-3 px-3 py-2.5 text-xs font-semibold text-slate-300 rounded-lg transition-colors hover:bg-slate-700/50 hover:text-white"
                                    >
                                        <div className="h-6 w-6 rounded-md bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                            <KeyRound size={12} className="text-blue-400" />
                                        </div>
                                        Ganti Password
                                    </button>
                                )}
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
            <main className="flex-1 flex flex-col min-h-screen pt-16 lg:pt-0 lg:ml-72 bg-slate-50/80 w-full lg:w-[calc(100%-18rem)]">
                {/* Content Wrapper */}
                <div className="flex-1 px-4 py-6 md:px-8 md:py-8 lg:px-10 w-full max-w-[1600px] mx-auto">
                    <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center bg-white/80 backdrop-blur-xl p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200/60 sticky top-[72px] lg:top-4 z-30 animate-fade-in">
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

            {/* Modal Ganti Password Admin */}
            {showChangePassword && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 animate-fade-in">
                        <div className="flex items-center justify-between p-6 border-b border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                    <KeyRound size={20} className="text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Ganti Password Admin</h2>
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
