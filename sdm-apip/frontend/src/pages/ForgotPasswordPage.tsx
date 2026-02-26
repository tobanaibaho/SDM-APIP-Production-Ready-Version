import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/authService';
import { Building2, Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            toast.error('Email wajib diisi');
            return;
        }

        setLoading(true);
        try {
            await forgotPassword(email);
            setSubmitted(true);
            toast.success('Instruksi reset password telah dikirim ke email Anda.');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal mengirim instruksi reset password.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute -bottom-8 -right-4 w-72 h-72 bg-accent-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

                <div className="w-full max-w-md z-10 animate-fade-in text-center">
                    <div className="glass rounded-3xl p-10 shadow-2xl border border-white/10 space-y-6">
                        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/50 mb-4">
                            <CheckCircle2 size={48} className="text-emerald-500" />
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Email Terkirim!</h1>
                        <p className="text-slate-400 text-lg leading-relaxed">
                            Kami telah mengirimkan instruksi pemulihan kata sandi ke <span className="text-primary-400 font-bold">{email}</span>.
                        </p>
                        <div className="pt-6">
                            <Link
                                to="/login"
                                className="flex items-center justify-center gap-2 w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all shadow-xl"
                            >
                                <ArrowLeft size={18} /> Kembali ke Login
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-0 -left-4 w-72 h-72 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute -bottom-8 -right-4 w-72 h-72 bg-accent-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

            <div className="w-full max-w-md z-10 animate-fade-in">
                <div className="glass rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                    <div className="bg-gradient-to-br from-slate-800 to-slate-950 p-8 text-center border-b border-white/5">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md mb-4 shadow-xl border border-white/20">
                            <Building2 size={32} className="text-primary-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Lupa Password?</h1>
                        <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-semibold opacity-80">Pemulihan Akses Akun</p>
                    </div>

                    <div className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="p-4 bg-primary-500/5 border border-primary-500/20 rounded-xl mb-4">
                                <p className="text-slate-300 text-sm leading-relaxed text-center">
                                    Masukkan email yang terdaftar pada akun Anda. Kami akan mengirimkan instruksi untuk mereset password Anda.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="form-label text-slate-400 font-bold uppercase tracking-wider text-xs">Email Terdaftar</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        className="form-input pl-12 bg-slate-900/50 border-slate-800 text-white focus:border-primary-500/50"
                                        placeholder="nama@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold rounded-2xl text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-300 shadow-lg shadow-primary-600/30 overflow-hidden"
                                disabled={loading}
                            >
                                <div className="absolute inset-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-[45deg] -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000"></div>
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <span>Kirim Instruksi Reset</span>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 text-center">
                            <Link
                                to="/login"
                                className="text-sm font-bold text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center gap-2"
                            >
                                <ArrowLeft size={16} /> Kembali ke Login
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
