import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Building2, Lock, Eye, EyeOff, Loader2, CheckCircle2, Shield, ArrowRight, ShieldCheck } from 'lucide-react';
import { setPassword } from '../services/authService';
import toast from 'react-hot-toast';

const AuthWrapper = ({ children, gradient, icon: Icon, title, subtitle }: any) => (
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

const SetPasswordPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    const otp = searchParams.get('otp');

    const [password, setPasswordValue] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

    const getPasswordStrength = () => {
        if (!password) return { strength: 0, label: '', color: '' };
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;

        const levels = [
            { label: 'SANGAT LEMAH', color: 'bg-red-500' },
            { label: 'LEMAH', color: 'bg-orange-500' },
            { label: 'SEDANG', color: 'bg-yellow-500' },
            { label: 'KUAT', color: 'bg-green-500' },
            { label: 'SANGAT AMAN', color: 'bg-emerald-500' },
        ];
        return {
            strength,
            label: levels[strength - 1]?.label || '',
            bg: levels[strength - 1]?.color || 'bg-slate-200',
        };
    };

    const validateForm = () => {
        const newErrors: { password?: string; confirmPassword?: string } = {};
        if (!password) {
            newErrors.password = 'Password wajib diisi';
        } else if (password.length < 8) {
            newErrors.password = 'Password minimal 8 karakter';
        } else if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
            newErrors.password = 'Harus mengandung A-Z, a-z, dan 0-9';
        }
        if (!confirmPassword) {
            newErrors.confirmPassword = 'Konfirmasi password wajib diisi';
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Password tidak cocok';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        if (!token || !otp) {
            toast.error('Data verifikasi tidak lengkap');
            return;
        }
        setLoading(true);
        try {
            await setPassword({
                token,
                otp,
                password,
                confirm_password: confirmPassword,
            });
            setSuccess(true);
            toast.success('Password berhasil dibuat!');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal membuat password');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <AuthWrapper
                gradient="from-red-600 to-red-800"
                icon={ShieldCheck}
                title="Token Tidak Valid"
                subtitle="KEAMANAN SISTEM"
            >
                <div className="text-center space-y-6">
                    <p className="text-slate-600 font-medium">Link verifikasi Anda tidak lengkap atau telah kadaluwarsa.</p>
                    <Link to="/login" className="btn-primary w-full flex items-center justify-center py-4">
                        Kembali ke Login
                    </Link>
                </div>
            </AuthWrapper>
        );
    }

    if (success) {
        return (
            <AuthWrapper
                gradient="from-green-600 to-green-800"
                icon={CheckCircle2}
                title="Selesai!"
                subtitle="AKUN TELAH AKTIF"
            >
                <div className="text-center space-y-6">
                    <p className="text-slate-600 font-medium leading-relaxed">
                        Akun Anda telah berhasil diaktifkan. Silakan masuk ke dalam sistem menggunakan NIP dan password yang baru saja Anda buat.
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="btn-primary w-full flex items-center justify-center gap-2 group py-4"
                    >
                        Masuk Sekarang
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </AuthWrapper>
        );
    }

    const strength = getPasswordStrength();

    return (
        <AuthWrapper
            gradient="from-slate-800 to-slate-900"
            icon={Building2}
            title="Keamanan Akun"
            subtitle="PENGATURAN PASSWORD"
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                    <label className="form-label">Password Baru</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
                            <Lock size={18} />
                        </div>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            autoFocus
                            className="form-input pl-11 pr-11"
                            placeholder="Huruf besar, kecil, & angka"
                            value={password}
                            onChange={(e) => setPasswordValue(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {password && (
                        <div className="mt-2 space-y-1">
                            <div className="flex gap-1 h-1">
                                {[1, 2, 3, 4, 5].map((level) => (
                                    <div
                                        key={level}
                                        className={`flex-1 rounded-full transition-all duration-500 ${level <= strength.strength ? strength.bg : 'bg-slate-100'}`}
                                    />
                                ))}
                            </div>
                            <p className={`text-[9px] font-black tracking-widest ${strength.strength > 0 ? 'text-slate-400' : 'text-slate-300'}`}>
                                {strength.label}
                            </p>
                        </div>
                    )}
                    {errors.password && <p className="text-[10px] text-red-500 font-bold uppercase mt-1">{errors.password}</p>}
                </div>

                <div className="space-y-1.5">
                    <label className="form-label">Konfirmasi Password</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
                            <Lock size={18} />
                        </div>
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            className="form-input pl-11 pr-11"
                            placeholder="Ulangi password baru"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {errors.confirmPassword && <p className="text-[10px] text-red-500 font-bold uppercase mt-1">{errors.confirmPassword}</p>}
                </div>

                <div className="bg-primary-50/50 rounded-2xl p-4 border border-primary-100 my-4">
                    <p className="text-[10px] font-bold text-primary-900 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Shield size={10} /> Standar Keamanan
                    </p>
                    <ul className="space-y-1.5">
                        {['Min. 8 Karakter', 'Besar/kecil (Aa)', 'Kombinasi Angka (123)'].map((rule, i) => (
                            <li key={i} className="flex items-center gap-2 text-[11px] text-slate-600 font-medium">
                                <CheckCircle2 size={10} className="text-green-500" /> {rule}
                            </li>
                        ))}
                    </ul>
                </div>

                <button
                    type="submit"
                    className="btn-primary w-full py-4 uppercase font-black tracking-widest shadow-xl shadow-primary-600/20 active:scale-95 transition-all"
                    disabled={loading}
                >
                    {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Aktivasi Akun'}
                </button>
            </form>
        </AuthWrapper>
    );
};

export default SetPasswordPage;
