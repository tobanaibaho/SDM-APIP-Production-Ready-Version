import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, User, Mail, Loader2, Info, ArrowRight } from 'lucide-react';
import { register } from '../services/authService';
import toast from 'react-hot-toast';

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const [nip, setNip] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ nip?: string; email?: string }>({});

    const validateForm = () => {
        const newErrors: { nip?: string; email?: string } = {};
        if (!nip) {
            newErrors.nip = 'NIP wajib diisi';
        } else if (!/^\d{18}$/.test(nip)) {
            newErrors.nip = 'NIP harus 18 digit angka';
        }
        if (!email) {
            newErrors.email = 'Email wajib diisi';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = 'Format email tidak valid';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);
        try {
            const result = await register({ nip, email });
            toast.success('Pendaftaran berhasil! Kode OTP telah dikirim ke email Anda.');

            if (result?.otp) {
                toast.success(`Kode OTP Anda: ${result.otp}`, { duration: 30000 });
            }

            navigate(`/verify-email?token=${result.token}`);
        } catch (error: any) {
            const message = error.response?.data?.error || 'Pendaftaran gagal';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-0 -left-4 w-72 h-72 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute -bottom-8 -right-4 w-72 h-72 bg-accent-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

            <div className="w-full max-w-md z-10 animate-fade-in">
                <div className="glass rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                    <div className="bg-gradient-to-br from-primary-600 to-primary-800 p-8 text-center">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md mb-4 shadow-xl border border-white/20">
                            <Building2 size={32} className="text-accent-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Daftar Akun Baru</h1>
                        <p className="text-slate-300 text-sm mt-1 uppercase tracking-widest font-semibold opacity-80">Inspektorat &mdash; Kemenko Infra</p>
                    </div>

                    <div className="p-8">
                        <div className="mb-6 rounded-2xl bg-primary-50/50 p-4 border border-primary-100 flex gap-3 animate-slide-down">
                            <Info size={18} className="text-primary-600 shrink-0" />
                            <p className="text-xs text-primary-800 leading-relaxed font-medium">
                                Pastikan NIP Anda sudah terdaftar dalam database SDM Inspektorat untuk melanjutkan pendaftaran.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="form-label text-slate-400">NIP (18 Digit)</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        autoFocus
                                        className="form-input pl-11 bg-slate-50 border-slate-200 focus:bg-white"
                                        placeholder="Contoh: 19850101..."
                                        value={nip}
                                        onChange={(e) => {
                                            setNip(e.target.value.replace(/\D/g, '').slice(0, 18));
                                            if (errors.nip) setErrors({ ...errors, nip: undefined });
                                        }}
                                        maxLength={18}
                                        disabled={loading}
                                    />
                                    {errors.nip && <p className="text-xs text-red-500 mt-1">{errors.nip}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="form-label text-slate-400">Email Kedinasan</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        className="form-input pl-11 bg-slate-50 border-slate-200 focus:bg-white"
                                        placeholder="email@kemenkoinfra.go.id"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            if (errors.email) setErrors({ ...errors, email: undefined });
                                        }}
                                        disabled={loading}
                                    />
                                    {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-300 shadow-lg shadow-primary-600/30 overflow-hidden"
                                disabled={loading}
                            >
                                <div className="absolute inset-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-[45deg] -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000"></div>
                                {loading ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    <span className="flex items-center gap-2">
                                        Daftar Akun <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </span>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 pt-8 border-t border-slate-100 text-center">
                            <p className="text-sm text-slate-500">
                                Sudah punya akun? {' '}
                                <Link to="/login" className="font-bold text-primary-600 hover:text-primary-500 transition-colors">
                                    Masuk Sekarang
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
