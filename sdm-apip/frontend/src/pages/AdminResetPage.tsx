import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { superAdminResetToDefault } from '../services/authService';
import { RefreshCw, CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminResetPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Token reset tidak ditemukan atau tidak valid.');
        }
    }, [token]);

    const handleConfirmReset = async () => {
        if (!token) return;

        setStatus('loading');
        try {
            await superAdminResetToDefault(token);
            setStatus('success');
            setMessage('Password Administrator telah berhasil direset ke default: Admin@123');
            toast.success('Password berhasil direset!');
        } catch (error: any) {
            setStatus('error');
            setMessage(error.response?.data?.error || 'Gagal mereset password. Token mungkin sudah kedaluwarsa.');
            toast.error('Gagal mereset password');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute -bottom-8 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

            <div className="w-full max-w-md z-10 animate-fade-in">
                <div className="glass rounded-3xl overflow-hidden shadow-2xl border border-white/10 text-center">
                    <div className="bg-gradient-to-br from-slate-800 to-slate-950 p-8 border-b border-white/5">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md mb-4 shadow-xl border border-white/20">
                            <RefreshCw size={32} className={`text-blue-400 ${status === 'loading' ? 'animate-spin' : ''}`} />
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Reset Password</h1>
                        <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-semibold opacity-80">Pemulihan Akses Admin</p>
                    </div>

                    <div className="p-8">
                        {status === 'idle' && (
                            <div className="space-y-6">
                                <div className="p-4 bg-blue-50/10 border border-blue-500/20 rounded-xl">
                                    <p className="text-slate-300 text-sm leading-relaxed">
                                        Anda telah meminta untuk mereset password Administrator kembali ke <span className="text-blue-400 font-bold">default</span>.
                                    </p>
                                    <div className="mt-3 p-2 bg-slate-900/50 rounded-lg border border-white/5">
                                        <code className="text-blue-300 font-mono text-sm">Admin@123</code>
                                    </div>
                                </div>
                                <button
                                    onClick={handleConfirmReset}
                                    className="group relative w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 shadow-lg shadow-blue-600/30 overflow-hidden"
                                >
                                    <div className="absolute inset-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-[45deg] -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000"></div>
                                    Konfirmasi Reset Password
                                </button>
                                <button
                                    onClick={() => navigate('/super-admin/login')}
                                    className="flex items-center justify-center gap-2 w-full text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                                >
                                    <ArrowLeft size={16} /> Batal dan Kembali
                                </button>
                            </div>
                        )}

                        {status === 'loading' && (
                            <div className="py-10 flex flex-col items-center">
                                <Loader2 size={48} className="animate-spin text-blue-500 mb-4" />
                                <p className="text-slate-400 animate-pulse">Sedang memproses reset password...</p>
                            </div>
                        )}

                        {status === 'success' && (
                            <div className="space-y-6">
                                <div className="flex flex-col items-center">
                                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/50 mb-4">
                                        <CheckCircle size={40} className="text-emerald-500" />
                                    </div>
                                    <h2 className="text-xl font-bold text-white mb-2">Berhasil!</h2>
                                    <p className="text-slate-400 text-sm leading-relaxed mb-6 px-4">
                                        {message}
                                    </p>
                                </div>
                                <button
                                    onClick={() => navigate('/super-admin/login')}
                                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20"
                                >
                                    Masuk Sekarang
                                </button>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="space-y-6">
                                <div className="flex flex-col items-center">
                                    <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center border border-rose-500/50 mb-4">
                                        <AlertCircle size={40} className="text-rose-500" />
                                    </div>
                                    <h2 className="text-xl font-bold text-white mb-2">Gagal</h2>
                                    <p className="text-slate-400 text-sm leading-relaxed mb-6 px-4">
                                        {message}
                                    </p>
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
                </div>

                <p className="mt-8 text-center text-slate-500 text-xs tracking-widest uppercase font-medium">
                    &copy; 2024 SDM APIP - Recovery Center
                </p>
            </div>
        </div>
    );
};

export default AdminResetPage;
