import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ShieldCheck, Lock, Eye, EyeOff } from 'lucide-react';
import { superAdminResetPassword } from '../services/authService';
import Logo from '../assets/logo.png';

const AdminResetPasswordPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const [token, setToken] = useState<string>('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const urlToken = searchParams.get('token');
        if (!urlToken) {
            toast.error('Token reset tidak valid atau tidak ditemukan');
            navigate('/super-admin/login');
        } else {
            setToken(urlToken);
        }
    }, [searchParams, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 8) {
            setError('Password minimal 8 karakter');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Konfirmasi password tidak cocok');
            return;
        }

        setLoading(true);
        try {
            await superAdminResetPassword(token, newPassword, confirmPassword);
            toast.success('Password Admin berhasil diperbarui!');
            navigate('/super-admin/login', { replace: true });
        } catch (err: any) {
            setError(err.response?.data?.error || 'Gagal mereset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center font-sans bg-slate-900 p-4">
            <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-accent-500/10 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 rounded-full bg-primary-500/10 blur-2xl"></div>

                <div className="relative z-10 flex flex-col items-center">
                    <img src={Logo} alt="Logo" className="h-16 w-16 mb-4" />
                    <h2 className="text-2xl font-black text-white mb-2 text-center">Reset Password</h2>
                    <p className="text-slate-400 text-sm font-medium mb-8 text-center">
                        Buat kata sandi baru untuk akun Administrator Anda.
                    </p>

                    <form onSubmit={handleSubmit} className="w-full space-y-5">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Password Baru</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-accent-500 transition-colors">
                                    <ShieldCheck size={18} />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="w-full pl-11 pr-12 py-3.5 bg-slate-900 border border-slate-800 rounded-xl focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500 transition-all outline-none text-white placeholder:text-slate-600 font-semibold"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-accent-500 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Konfirmasi Password Baru</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-accent-500 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    className="w-full pl-11 pr-12 py-3.5 bg-slate-900 border border-slate-800 rounded-xl focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500 transition-all outline-none text-white placeholder:text-slate-600 font-semibold"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-accent-500 transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-semibold text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !newPassword || !confirmPassword}
                            className="w-full bg-accent-600 text-white font-bold py-3.5 rounded-xl hover:bg-accent-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent-600/20 mt-4"
                        >
                            {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminResetPasswordPage;
