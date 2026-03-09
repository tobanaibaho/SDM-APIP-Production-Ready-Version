import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { superAdminForgotPassword } from '../services/authService';
import Logo from '../assets/logo.png';
import { ShieldCheck, Lock, User as UserIcon, Eye, EyeOff, Loader2, ArrowRight, HelpCircle } from 'lucide-react';
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
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans text-slate-100">
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]"></div>

            <div className="w-full max-w-md z-10 animate-fade-in">
                {/* Header Logo */}
                <div className="text-center mb-10">
                    <img src={Logo} alt="Logo Kemenko" className="h-24 w-24 mx-auto mb-5 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]" />
                    <h1 className="font-serif text-xl font-bold text-white uppercase tracking-wide leading-snug drop-shadow-md">INSPEKTORAT<br />KEMENKO INFRA</h1>
                    <div className="h-1 w-24 bg-gradient-to-r from-accent-400 to-accent-600 mx-auto mt-4 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)]"></div>
                    <p className="text-slate-300 font-serif text-sm mt-4 font-semibold uppercase tracking-[0.25em]">Portal Administrator</p>
                </div>

                <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden">
                    <div className="bg-slate-950 p-4 flex items-center justify-center gap-3 border-b border-slate-700/50">
                        <ShieldCheck size={20} className="text-accent-500" />
                        <h2 className="text-white font-bold text-sm tracking-widest uppercase">Akses Sistem Pengendali</h2>
                    </div>

                    <div className="p-8 pt-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {!requiresMFA ? (
                                <>
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Username</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-accent-500 transition-colors">
                                                <UserIcon size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                autoFocus
                                                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500 transition-all outline-none text-white placeholder:text-slate-600 font-medium"
                                                placeholder="Username"
                                                value={username}
                                                onChange={(e) => {
                                                    setUsername(e.target.value);
                                                    if (errors.username) setErrors({ ...errors, username: undefined });
                                                }}
                                                disabled={loading || resetLoading}
                                            />
                                            {errors.username && <p className="text-xs text-red-400 mt-1 font-medium">{errors.username}</p>}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center ml-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Password</label>
                                            <button
                                                type="button"
                                                onClick={handleForgotPassword}
                                                className="text-[10px] font-bold text-accent-500 hover:text-accent-400 flex items-center gap-1 transition-colors uppercase tracking-wide"
                                                disabled={resetLoading}
                                            >
                                                <HelpCircle size={12} />
                                                {resetLoading ? 'Mengirim...' : 'Lupa Password?'}
                                            </button>
                                        </div>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-accent-500 transition-colors">
                                                <Lock size={18} />
                                            </div>
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                className="w-full pl-10 pr-12 py-3 bg-slate-900/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500 transition-all outline-none text-white placeholder:text-slate-600 font-medium"
                                                placeholder="Password"
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
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-accent-500 transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                            {errors.password && <p className="text-xs text-red-400 mt-1 font-medium">{errors.password}</p>}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="text-center space-y-1 mb-4">
                                        <h3 className="text-white font-bold text-sm uppercase tracking-wider">Verifikasi Dua Faktor</h3>
                                        <p className="text-slate-400 text-[10px] uppercase font-bold tracking-tight">Masukkan kode 6 digit dari aplikasi autentikator Anda</p>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-accent-500">
                                                <ShieldCheck size={20} />
                                            </div>
                                            <input
                                                type="text"
                                                autoFocus
                                                maxLength={6}
                                                className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border-2 border-slate-700 rounded-xl focus:ring-4 focus:ring-accent-500/20 focus:border-accent-500 transition-all outline-none text-white text-center text-2xl font-black tracking-[0.5em] placeholder:text-slate-800"
                                                placeholder="000000"
                                                value={totp}
                                                onChange={(e) => {
                                                    setTotp(e.target.value.replace(/\D/g, ''));
                                                    if (mfaError) setMfaError('');
                                                }}
                                                disabled={loading}
                                            />
                                        </div>
                                        {mfaError && <p className="text-xs text-red-400 mt-1 text-center font-bold uppercase tracking-tight italic">{mfaError}</p>}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRequiresMFA(false);
                                            setTotp('');
                                            setMfaError('');
                                        }}
                                        className="w-full text-center text-[10px] font-bold text-slate-500 hover:text-accent-500 uppercase tracking-widest transition-colors py-2"
                                    >
                                        Gunakan Akun Lain
                                    </button>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-slate-900 bg-accent-500 hover:bg-accent-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 transition-all shadow-lg hover:shadow-accent-500/20 disabled:opacity-70 disabled:cursor-not-allowed mt-4 uppercase tracking-wide"
                                disabled={loading || resetLoading}
                            >
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <span className="flex items-center gap-2">
                                        {requiresMFA ? 'Verifikasi & Masuk' : 'Masuk Panel Admin'} <ArrowRight size={16} />
                                    </span>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
                            <Link to="/login" className="text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-widest flex items-center justify-center gap-2">
                                <ArrowRight className="rotate-180" size={12} />
                                Kembali ke Login Pegawai
                            </Link>
                        </div>
                    </div>
                </div>

                <p className="mt-8 text-center text-slate-600 text-[10px] uppercase tracking-[0.2em] font-bold opacity-50">
                    Authorized Access Only &bull; Secured System
                </p>
            </div>
        </div>
    );
};

export default AdminLoginPage;
