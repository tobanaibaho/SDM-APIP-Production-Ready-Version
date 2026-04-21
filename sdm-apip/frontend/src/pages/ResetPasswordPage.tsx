import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../services/authService';
import { Lock, Key, Loader2, ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const ResetPasswordPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';
    const navigate = useNavigate();

    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!otp || !newPassword || !confirmPassword) {
            toast.error('Semua data wajib diisi');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('Konfirmasi password tidak sesuai');
            return;
        }

        if (newPassword.length < 8) {
            toast.error('Password minimal 8 karakter');
            return;
        }

        setLoading(true);
        try {
            await resetPassword({
                token,
                otp,
                new_password: newPassword,
                confirm_password: confirmPassword
            });
            toast.success('Password berhasil diperbarui! Silakan login kembali.');
            navigate('/login');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal mereset password. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
                <div className="glass rounded-3xl p-10 max-w-md border border-white/10">
                    <h2 className="text-2xl font-bold text-white mb-4">Link Tidak Valid</h2>
                    <p className="text-slate-400 mb-8">Link reset password tidak valid atau sudah kedaluwarsa.</p>
                    <button
                        onClick={() => navigate('/forgot-password')}
                        className="w-full py-4 bg-primary-600 text-white font-bold rounded-2xl hover:bg-primary-700 transition-all"
                    >
                        Minta Link Baru
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute -bottom-8 -right-4 w-72 h-72 bg-accent-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

            <div className="w-full max-w-md z-10 animate-fade-in">
                <div className="glass rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                    <div className="bg-gradient-to-br from-slate-800 to-slate-950 p-8 text-center border-b border-white/5">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md mb-4 shadow-xl border border-white/20">
                            <ShieldCheck size={32} className="text-primary-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Atur Ulang Password</h1>
                        <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-semibold opacity-80">Keamanan Akun Baru</p>
                    </div>

                    <div className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="form-label text-slate-400 font-bold uppercase tracking-wider text-[10px]">Kode OTP (Cek Email)</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
                                        <Key size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        className="form-input pl-12 bg-slate-900/50 border-slate-800 text-white tracking-[0.5em] font-mono text-center"
                                        placeholder="000000"
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtp(e.target.value.replace(/\D/g, ''))}
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="form-label text-slate-400 font-bold uppercase tracking-wider text-[10px]">Password Baru</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="form-input pl-12 pr-12 bg-slate-900/50 border-slate-800 text-white"
                                        placeholder="Minimal 8 karakter"
                                        value={newPassword}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="form-label text-slate-400 font-bold uppercase tracking-wider text-[10px]">Konfirmasi Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="form-input pl-12 bg-slate-900/50 border-slate-800 text-white"
                                        placeholder="Ulangi password baru"
                                        value={confirmPassword}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold rounded-2xl text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-300 shadow-lg shadow-primary-600/30 overflow-hidden"
                                    disabled={loading}
                                >
                                    <div className="absolute inset-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-[45deg] -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000"></div>
                                    {loading ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <span>Update Password</span>
                                    )}
                                </button>
                            </div>
                        </form>

                        <div className="mt-8 text-center">
                            <button
                                onClick={() => navigate('/login')}
                                className="text-sm font-bold text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center gap-2 w-full"
                            >
                                <ArrowLeft size={16} /> Kembali ke Login
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
