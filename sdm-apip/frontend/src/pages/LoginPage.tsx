import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../assets/logo.png';
import { Lock, User, Eye, EyeOff, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
    const [nip, setNip] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ nip?: string; password?: string }>({});

    // MFA States
    const [requiresMFA, setRequiresMFA] = useState(false);
    const [totp, setTotp] = useState('');
    const [mfaError, setMfaError] = useState('');

    const { login } = useAuth();
    const navigate = useNavigate();

    const validateForm = () => {
        const newErrors: { nip?: string; password?: string } = {};
        if (!nip) {
            newErrors.nip = 'NIP wajib diisi';
        } else if (!/^\d{18}$/.test(nip)) {
            newErrors.nip = 'NIP harus 18 digit angka';
        }
        if (!password) {
            newErrors.password = 'Password wajib diisi';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);
        setMfaError('');
        try {
            const res = await login(nip, password, totp);
            if (res.requires_mfa) {
                setRequiresMFA(true);
                toast.success('Silakan masukkan kode MFA Anda');
            } else {
                navigate('/dashboard');
            }
        } catch (error: any) {
            if (requiresMFA) {
                setMfaError(error.response?.data?.error || 'Kode MFA tidak valid');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-10 bg-[radial-gradient(#1e3a8a_1px,transparent_1px)] [background-size:16px_16px]"></div>

            <div className="w-full max-w-md z-10 animate-fade-in">
                {/* Header Logo */}
                <div className="text-center mb-8">
                    <img src={Logo} alt="Logo Kemenko" className="h-24 w-24 mx-auto mb-5 drop-shadow-xl" />
                    <h1 className="font-serif text-2xl font-bold text-primary-900 uppercase tracking-wide leading-snug drop-shadow-sm">INSPEKTORAT<br />KEMENKO INFRASTRUKTUR</h1>
                    <div className="h-1 w-24 bg-gradient-to-r from-accent-400 to-accent-600 mx-auto mt-4 rounded-full shadow-sm"></div>
                    <p className="text-slate-600 font-serif text-sm mt-4 font-semibold uppercase tracking-[0.2em]">Sistem Informasi SDM APIP</p>
                </div>

                <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                    <div className="bg-primary-900 p-4 text-center">
                        <h2 className="text-white font-bold text-lg tracking-wide">
                            {requiresMFA ? 'VERIFIKASI KEAMANAN' : 'LOGIN PEGAWAI'}
                        </h2>
                    </div>

                    <div className="p-8 pt-6">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {!requiresMFA ? (
                                <>
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">NIP (Nomor Induk Pegawai)</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-600 transition-colors">
                                                <User size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                autoFocus
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none text-slate-900 placeholder:text-slate-400 font-medium"
                                                placeholder="Ketik 18 digit NIP Anda"
                                                value={nip}
                                                onChange={(e) => {
                                                    setNip(e.target.value.replace(/\D/g, '').slice(0, 18));
                                                    if (errors.nip) setErrors({ ...errors, nip: undefined });
                                                }}
                                                maxLength={18}
                                                disabled={loading}
                                            />
                                            {errors.nip && <p className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">⚠️ {errors.nip}</p>}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Password</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-600 transition-colors">
                                                <Lock size={18} />
                                            </div>
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none text-slate-900 placeholder:text-slate-400 font-medium"
                                                placeholder="Masukkan password akun"
                                                value={password}
                                                onChange={(e) => {
                                                    setPassword(e.target.value);
                                                    if (errors.password) setErrors({ ...errors, password: undefined });
                                                }}
                                                disabled={loading}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-primary-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                            {errors.password && <p className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">⚠️ {errors.password}</p>}
                                        </div>
                                        <div className="flex justify-end pt-1">
                                            <Link
                                                to="/forgot-password"
                                                className="text-xs font-bold text-primary-600 hover:text-primary-800 transition-colors hover:underline"
                                            >
                                                Lupa Password?
                                            </Link>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="text-center space-y-2 mb-4">
                                        <ShieldCheck size={40} className="mx-auto text-primary-600" />
                                        <p className="text-slate-600 text-sm font-medium">Buka aplikasi autentikator Anda dan masukkan kode 6 digit yang muncul.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            autoFocus
                                            maxLength={6}
                                            className="w-full py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-600 transition-all outline-none text-slate-900 text-center text-3xl font-black tracking-[0.5em] placeholder:text-slate-200"
                                            placeholder="000000"
                                            value={totp}
                                            onChange={(e) => {
                                                setTotp(e.target.value.replace(/\D/g, ''));
                                                if (mfaError) setMfaError('');
                                            }}
                                            disabled={loading}
                                        />
                                        {mfaError && <p className="text-xs text-red-600 mt-1 text-center font-bold italic">{mfaError}</p>}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRequiresMFA(false);
                                            setTotp('');
                                            setMfaError('');
                                        }}
                                        className="w-full text-center text-xs font-bold text-slate-400 hover:text-primary-600 transition-colors py-2 uppercase tracking-widest"
                                    >
                                        Kembali ke Password
                                    </button>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-primary-700 hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-600 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <span className="flex items-center gap-2">
                                        {requiresMFA ? 'VERIFIKASI & MASUK' : 'MASUK APLIKASI'} <ArrowRight size={16} />
                                    </span>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 text-center space-y-4 pt-6 border-t border-slate-100">
                            <p className="text-sm text-slate-600">
                                Belum punya akun? {' '}
                                <Link to="/register" className="font-bold text-primary-700 hover:text-primary-900 hover:underline transition-colors">
                                    Registrasi Pegawai
                                </Link>
                            </p>
                            <div className="pt-2">
                                <Link
                                    to="/super-admin/login"
                                    className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors border border-slate-200 px-3 py-1 rounded hover:bg-slate-50"
                                >
                                    Login Administrator
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="mt-8 text-center text-slate-400 text-xs font-medium">
                    &copy; {new Date().getFullYear()} Inspektorat Kemenko Infrastruktur dan Pembangunan Kewilayahan
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
