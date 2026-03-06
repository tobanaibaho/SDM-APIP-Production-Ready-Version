import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { superAdminResetToDefault } from '../services/authService';
import { KeyRound, CheckCircle, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminResetPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<{ new?: string; confirm?: string }>({});

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Token reset tidak ditemukan atau tidak valid. Silakan ulangi permintaan lupa password.');
        }
    }, [token]);

    const validate = () => {
        const errs: { new?: string; confirm?: string } = {};
        if (!newPassword) errs.new = 'Password baru wajib diisi';
        else if (newPassword.length < 8) errs.new = 'Minimal 8 karakter';
        else if (!/[A-Z]/.test(newPassword)) errs.new = 'Harus mengandung huruf kapital';
        else if (!/[0-9]/.test(newPassword)) errs.new = 'Harus mengandung angka';
        if (!confirmPassword) errs.confirm = 'Konfirmasi password wajib diisi';
        else if (newPassword !== confirmPassword) errs.confirm = 'Password tidak cocok';
        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !validate()) return;

        setStatus('loading');
        try {
            await superAdminResetToDefault(token, newPassword, confirmPassword);
            setStatus('success');
            setMessage('Password Administrator berhasil diperbarui. Semua sesi aktif telah dicabut untuk keamanan.');
            toast.success('Password berhasil direset!');
        } catch (error: any) {
            const errMsg = error.response?.data?.error || error.response?.data?.message || 'Gagal mereset password. Token mungkin sudah kadaluwarsa.';
            setStatus('error');
            setMessage(errMsg);
            toast.error(errMsg);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background */}
            <div className="absolute top-0 -left-4 w-96 h-96 bg-red-900 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
            <div className="absolute -bottom-8 -right-4 w-96 h-96 bg-slate-800 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

            <div className="w-full max-w-md z-10 animate-fade-in">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-red-900/30 border border-red-700/40 shadow-xl mb-4">
                        <ShieldAlert size={32} className="text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Reset Password Admin</h1>
                    <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest font-semibold">Pemulihan Akses Administrator</p>
                </div>

                <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">

                    {/* Idle — form input password baru */}
                    {status === 'idle' && (
                        <form onSubmit={handleSubmit} className="p-8 space-y-5">
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Buat password baru untuk akun Administrator. Pastikan password kuat dan mudah Anda ingat.
                            </p>

                            {/* New Password */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Password Baru</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-red-400 transition-colors">
                                        <KeyRound size={17} />
                                    </div>
                                    <input
                                        type={showNew ? 'text' : 'password'}
                                        className="w-full pl-10 pr-11 py-3 bg-slate-800/60 border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-all outline-none text-white placeholder:text-slate-600 text-sm font-medium"
                                        placeholder="Min. 8 karakter, huruf kapital & angka"
                                        value={newPassword}
                                        onChange={(e) => {
                                            setNewPassword(e.target.value);
                                            if (fieldErrors.new) setFieldErrors(p => ({ ...p, new: undefined }));
                                        }}
                                    />
                                    <button type="button" onClick={() => setShowNew(!showNew)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-red-400 transition-colors">
                                        {showNew ? <EyeOff size={17} /> : <Eye size={17} />}
                                    </button>
                                </div>
                                {fieldErrors.new && <p className="text-xs text-red-400 font-medium">{fieldErrors.new}</p>}
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Konfirmasi Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-red-400 transition-colors">
                                        <KeyRound size={17} />
                                    </div>
                                    <input
                                        type={showConfirm ? 'text' : 'password'}
                                        className="w-full pl-10 pr-11 py-3 bg-slate-800/60 border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-all outline-none text-white placeholder:text-slate-600 text-sm font-medium"
                                        placeholder="Ulangi password baru"
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value);
                                            if (fieldErrors.confirm) setFieldErrors(p => ({ ...p, confirm: undefined }));
                                        }}
                                    />
                                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-red-400 transition-colors">
                                        {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                                    </button>
                                </div>
                                {fieldErrors.confirm && <p className="text-xs text-red-400 font-medium">{fieldErrors.confirm}</p>}
                            </div>

                            {/* Password requirements hint */}
                            <div className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg">
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    🔒 Password harus min. <strong className="text-slate-400">8 karakter</strong>, mengandung <strong className="text-slate-400">huruf kapital</strong> dan <strong className="text-slate-400">angka</strong>.
                                </p>
                            </div>

                            <button
                                type="submit"
                                className="group relative w-full flex justify-center items-center gap-2 py-3.5 px-4 text-sm font-bold rounded-xl text-white bg-red-700 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all shadow-lg shadow-red-900/30 overflow-hidden mt-2"
                            >
                                <div className="absolute inset-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-[45deg] -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000"></div>
                                <KeyRound size={16} /> Simpan Password Baru
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/super-admin/login')}
                                className="flex items-center justify-center gap-2 w-full text-sm font-semibold text-slate-500 hover:text-slate-300 transition-colors"
                            >
                                <ArrowLeft size={15} /> Batal dan Kembali ke Login
                            </button>
                        </form>
                    )}

                    {/* Loading */}
                    {status === 'loading' && (
                        <div className="p-12 flex flex-col items-center">
                            <Loader2 size={48} className="animate-spin text-red-500 mb-4" />
                            <p className="text-slate-400 animate-pulse text-sm">Menyimpan password baru...</p>
                        </div>
                    )}

                    {/* Success */}
                    {status === 'success' && (
                        <div className="p-8 space-y-6">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/50 mb-4">
                                    <CheckCircle size={40} className="text-emerald-500" />
                                </div>
                                <h2 className="text-xl font-bold text-white mb-2">Berhasil!</h2>
                                <p className="text-slate-400 text-sm leading-relaxed px-4">{message}</p>
                            </div>
                            <button
                                onClick={() => navigate('/super-admin/login')}
                                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20"
                            >
                                Masuk Sekarang →
                            </button>
                        </div>
                    )}

                    {/* Error */}
                    {status === 'error' && (
                        <div className="p-8 space-y-6">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center border border-rose-500/50 mb-4">
                                    <AlertCircle size={40} className="text-rose-500" />
                                </div>
                                <h2 className="text-xl font-bold text-white mb-2">Gagal</h2>
                                <p className="text-slate-400 text-sm leading-relaxed px-4">{message}</p>
                            </div>
                            <button
                                onClick={() => navigate('/super-admin/login')}
                                className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all"
                            >
                                <ArrowLeft size={18} /> Kembali ke Login
                            </button>
                        </div>
                    )}
                </div>

                <p className="mt-8 text-center text-slate-600 text-xs tracking-widest uppercase font-medium">
                    © 2026 SDM APIP — Authorized Access Only
                </p>
            </div>
        </div>
    );
};

export default AdminResetPage;
