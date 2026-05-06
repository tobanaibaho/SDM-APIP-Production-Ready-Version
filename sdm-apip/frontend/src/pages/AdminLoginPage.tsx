import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { superAdminForgotPassword } from '../services/authService';
import Logo from '../assets/logo.png';
import { ShieldCheck, Lock, User as UserIcon, Eye, EyeOff, Loader2, ArrowRight, HelpCircle, Server, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminLoginPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
    const [requiresMFA, setRequiresMFA] = useState(false);
    const [totp, setTotp] = useState('');
    const [mfaError, setMfaError] = useState('');

    const { superAdminLogin } = useAuth();
    const navigate = useNavigate();

    const validateForm = () => {
        const newErrors: { username?: string; password?: string } = {};
        if (!username) newErrors.username = 'Username wajib diisi';
        if (!password) newErrors.password = 'Password wajib diisi';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        setLoading(true);
        setMfaError('');
        try {
            const res = await superAdminLogin(username, password, totp);
            if (res.requires_mfa) {
                setRequiresMFA(true);
                toast.success('Silakan masukkan kode MFA Anda');
            } else {
                navigate('/super-admin');
            }
        } catch (error: any) {
            if (requiresMFA) {
                setMfaError(error.response?.data?.error || 'Kode MFA tidak valid');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!username) {
            setErrors({ username: 'Masukkan username untuk reset password' });
            return;
        }
        setResetLoading(true);
        try {
            const debugToken = await superAdminForgotPassword(username);
            toast.success('Instruksi reset telah dikirim ke email Admin');
            if (debugToken) {
                toast((t) => (
                    <div className="flex flex-col gap-2">
                        <span className="text-sm">
                            <b className="text-primary-600">[Dev Mode]</b> Token reset: {debugToken.substring(0, 8)}...
                        </span>
                        <button
                            onClick={() => {
                                toast.dismiss(t.id);
                                navigate(`/super-admin/reset-password?token=${debugToken}`);
                            }}
                            className="bg-primary-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-primary-700 transition-colors"
                        >
                            Konfirmasi Reset
                        </button>
                    </div>
                ), { duration: 10000 });
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal mengirim instruksi reset');
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex font-sans bg-slate-900">
            {/* LEFT PANEL - LANDING / SYSTEM PROFILE (Hidden on Mobile) */}
            <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 bg-slate-950 overflow-hidden border-r border-slate-800">
                {/* Background Pattern/Accents */}
                <div className="absolute inset-0 z-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]"></div>
                <div className="absolute top-0 left-0 -ml-32 -mt-32 w-96 h-96 rounded-full bg-accent-500/10 blur-3xl"></div>
                <div className="absolute bottom-0 right-0 -mr-32 -mb-32 w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-3xl"></div>

                {/* Top Section - Branding */}
                <div className="relative z-10">
                    <div className="flex items-center gap-6 mb-6">
                        <img src={Logo} alt="Logo Kemenko" className="h-36 w-36 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] grayscale opacity-80" />
                        <div>
                            <h2 className="text-white font-serif font-bold text-2xl tracking-wide uppercase">Inspektorat</h2>
                            <p className="text-slate-400 text-sm font-bold tracking-[0.2em] uppercase mt-1 leading-snug">Kementerian Koordinator Bidang<br/>Infrastruktur & Pembangunan Kewilayahan</p>
                        </div>
                    </div>
                </div>

                {/* Middle Section - Profile/Landing Message */}
                <div className="relative z-10 max-w-2xl mt-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 border border-slate-700 rounded-full text-slate-300 text-xs font-bold uppercase tracking-widest mb-6">
                        <ShieldCheck size={14} className="text-accent-500" />
                        Sistem Pengendali Pusat
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-6 tracking-tight">
                        Administrator <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-400 to-accent-200">
                            Command Center
                        </span>
                    </h1>
                    <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-xl">
                        Portal khusus manajemen sistem dan pengawasan data untuk memastikan seluruh proses evaluasi SDM APIP berjalan lancar, aman, dan tanpa kendala.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-4 rounded-2xl">
                            <Server className="text-accent-500 mb-2" size={24} />
                            <h3 className="text-white font-bold text-sm mb-1">Manajemen Terpusat</h3>
                            <p className="text-slate-400 text-xs">Akses penuh pengelolaan pengguna, grup, dan periode evaluasi.</p>
                        </div>
                        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-4 rounded-2xl">
                            <Activity className="text-accent-500 mb-2" size={24} />
                            <h3 className="text-white font-bold text-sm mb-1">Monitoring Real-time</h3>
                            <p className="text-slate-400 text-xs">Pantau kemajuan pengisian survei dan laporan secara langsung.</p>
                        </div>
                    </div>
                </div>

                {/* Bottom Section - Warning */}
                <div className="relative z-10 mt-12">
                    <p className="text-slate-500 text-xs uppercase tracking-[0.2em] font-bold">
                        Authorized Access Only &bull; Secured System
                    </p>
                </div>
            </div>

            {/* RIGHT PANEL - LOGIN FORM */}
            <div className="w-full lg:w-[45%] flex items-center justify-center p-6 sm:p-12 relative">
                {/* Mobile Logo Only (Hidden on Desktop) */}
                <div className="absolute top-8 left-8 lg:hidden flex items-center gap-3">
                    <ShieldCheck className="text-accent-500" size={32} />
                    <span className="font-bold text-white text-sm tracking-widest uppercase">Admin Panel</span>
                </div>

                <div className="w-full max-w-sm">
                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-3xl font-black text-white mb-2">
                            {requiresMFA ? 'Keamanan Berlapis' : 'Akses Sistem'}
                        </h2>
                        <p className="text-slate-400 text-sm font-medium">
                            {requiresMFA
                                ? 'Masukkan 6 digit kode MFA untuk verifikasi admin.'
                                : 'Masukkan kredensial administrator Anda.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {!requiresMFA ? (
                            <>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Username Admin</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-accent-500 transition-colors">
                                            <UserIcon size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            autoFocus
                                            className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500 transition-all outline-none text-white placeholder:text-slate-600 font-semibold"
                                            placeholder="Username"
                                            value={username}
                                            onChange={(e) => {
                                                setUsername(e.target.value);
                                                if (errors.username) setErrors({ ...errors, username: undefined });
                                            }}
                                            disabled={loading || resetLoading}
                                        />
                                        {errors.username && <p className="text-xs text-red-400 mt-1.5 font-bold flex items-center gap-1">⚠️ {errors.username}</p>}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Password</label>
                                        <button
                                            type="button"
                                            onClick={handleForgotPassword}
                                            className="text-xs font-bold text-accent-500 hover:text-accent-400 flex items-center gap-1 transition-colors"
                                            disabled={resetLoading}
                                        >
                                            <HelpCircle size={14} />
                                            {resetLoading ? 'Memproses...' : 'Lupa Sandi?'}
                                        </button>
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-accent-500 transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            className="w-full pl-11 pr-12 py-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500 transition-all outline-none text-white placeholder:text-slate-600 font-semibold"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => {
                                                setPassword(e.target.value);
                                                if (errors.password) setErrors({ ...errors, password: undefined });
                                            }}
                                            disabled={loading || resetLoading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-accent-500 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                        {errors.password && <p className="text-xs text-red-400 mt-1.5 font-bold flex items-center gap-1">⚠️ {errors.password}</p>}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        autoFocus
                                        maxLength={6}
                                        className="w-full py-4 bg-slate-950 border-2 border-slate-800 rounded-xl focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500 transition-all outline-none text-white text-center text-2xl font-black tracking-[0.5em] placeholder:text-slate-800"
                                        placeholder="000000"
                                        value={totp}
                                        onChange={(e) => {
                                            setTotp(e.target.value.replace(/\D/g, ''));
                                            if (mfaError) setMfaError('');
                                        }}
                                        disabled={loading}
                                    />
                                    {mfaError && <p className="text-xs text-red-400 mt-1 text-center font-bold">{mfaError}</p>}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setRequiresMFA(false);
                                        setTotp('');
                                        setMfaError('');
                                    }}
                                    className="w-full text-center text-xs font-bold text-slate-500 hover:text-accent-500 transition-colors py-2 uppercase tracking-widest"
                                >
                                    Batal
                                </button>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-slate-900 bg-accent-500 hover:bg-accent-400 focus:outline-none focus:ring-4 focus:ring-accent-500/20 transition-all shadow-lg hover:shadow-accent-500/20 disabled:opacity-70 disabled:cursor-not-allowed mt-4 uppercase tracking-wide"
                            disabled={loading || resetLoading}
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    {requiresMFA ? 'Verifikasi' : 'Masuk Administrator'} <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 pt-6 border-t border-slate-800 flex justify-center">
                        <Link
                            to="/login"
                            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-colors"
                        >
                            <ArrowRight className="rotate-180" size={14} />
                            Portal Pegawai
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLoginPage;
