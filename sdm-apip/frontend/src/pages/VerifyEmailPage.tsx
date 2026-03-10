import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
    CheckCircle2,
    XCircle,
    Loader2,
    ArrowRight,
    Mail,
    Key,
} from 'lucide-react';
import { verifyEmail } from '../services/authService';
import toast from 'react-hot-toast';

const StatusWrapper = ({ children, gradient, icon: Icon, title, subtitle }: any) => (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-8 -right-4 w-72 h-72 bg-accent-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

        <div className="w-full max-w-md z-10 animate-fade-in">
            <div className="glass rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                <div className={`bg-gradient-to-br ${gradient} p-8 text-center`}>
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md mb-4 shadow-xl border border-white/20">
                        <Icon size={32} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
                    <p className="text-white/70 text-sm mt-1 uppercase tracking-widest font-semibold">{subtitle}</p>
                </div>
                <div className="p-8">
                    {children}
                </div>
            </div>
        </div>
    </div>
);

const VerifyEmailPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [otp, setOtp] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Token verifikasi tidak ditemukan');
        }
    }, [token]);

    const handleVerify = async () => {
        if (!token || !otp) return;

        setStatus('loading');
        try {
            await verifyEmail(token, otp);
            setStatus('success');
            toast.success('Email berhasil diverifikasi!');
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || 'Verifikasi gagal';
            setStatus('error');
            setMessage(errorMsg);
            toast.error(errorMsg);
        }
    };

    // Auto-verify when OTP reaches 6 digits
    useEffect(() => {
        if (otp.length === 6 && status === 'idle' && token) {
            handleVerify();
        }
    }, [otp, status, token]);

    const handleVerifySubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        handleVerify();
    };

    if (status === 'loading') {
        return (
            <StatusWrapper
                gradient="from-slate-700 to-slate-900"
                icon={Loader2}
                title="Verifikasi OTP"
                subtitle="MOHON TUNGGU SEBENTAR"
            >
                <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="loading-spinner" />
                    <p className="text-slate-500 font-medium">Sedang memproses kode keamanan Anda...</p>
                </div>
            </StatusWrapper>
        );
    }

    if (status === 'error') {
        return (
            <StatusWrapper
                gradient="from-red-600 to-red-800"
                icon={XCircle}
                title="Verifikasi Gagal"
                subtitle="KESALAHAN SISTEM"
            >
                <div className="text-center space-y-6">
                    <p className="text-slate-600 font-medium">{message || 'Kode OTP mungkin salah atau sudah kadaluwarsa.'}</p>
                    <div className="rounded-2xl bg-red-50 p-4 border border-red-100 text-xs text-red-800 leading-relaxed">
                        Mohon periksa kembali email Anda (termasuk folder spam) atau lakukan pendaftaran ulang jika masalah berlanjut.
                    </div>
                    <div className="flex gap-3">
                        <Link to="/register" className="btn-secondary flex-1">Daftar Ulang</Link>
                        <Link to="/login" className="btn-primary flex-1">Kembali Login</Link>
                    </div>
                </div>
            </StatusWrapper>
        );
    }

    if (status === 'success') {
        return (
            <StatusWrapper
                gradient="from-green-600 to-green-800"
                icon={CheckCircle2}
                title="Verifikasi Berhasil!"
                subtitle="EMAIL TERKONFIRMASI"
            >
                <div className="text-center space-y-6">
                    <p className="text-slate-600 font-medium leading-relaxed">
                        Data Anda telah tervalidasi. Langkah terakhir adalah membuat password untuk mengamankan akun Anda.
                    </p>
                    <button
                        onClick={() => navigate(`/set-password?token=${token}&otp=${otp}`)}
                        className="btn-primary w-full flex items-center justify-center gap-2 group py-4"
                    >
                        Lanjutkan Buat Password
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </StatusWrapper>
        );
    }

    return (
        <StatusWrapper
            gradient="from-primary-600 to-primary-800"
            icon={Mail}
            title="Konfirmasi Email"
            subtitle="KEAMANAN AKUN"
        >
            <form onSubmit={handleVerifySubmit} className="space-y-6">
                <div className="space-y-3">
                    <label className="form-label text-slate-500 text-center block">Kode OTP 6-Digit</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
                            <Key size={18} />
                        </div>
                        <input
                            type="text"
                            value={otp}
                            autoFocus
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="form-input pl-11 text-center text-3xl font-black tracking-[0.5em] focus:bg-white bg-slate-50 border-slate-200"
                            placeholder="000000"
                            maxLength={6}
                            required
                        />
                    </div>
                    <p className="text-center text-xs text-slate-400">
                        Kode unik telah dikirim ke email Anda.
                    </p>
                </div>

                <button
                    type="submit"
                    className="btn-primary w-full py-4 font-black tracking-widest uppercase disabled:opacity-50 shadow-xl shadow-primary-600/20"
                    disabled={otp.length !== 6}
                >
                    Verifikasi Sekarang
                </button>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-100 text-center">
                <p className="text-sm text-slate-500">
                    Tidak menerima kode? {' '}
                    <Link to="/register" className="font-bold text-primary-600 hover:text-primary-500">
                        Kirim Ulang
                    </Link>
                </p>
            </div>
        </StatusWrapper>
    );
};

export default VerifyEmailPage;
