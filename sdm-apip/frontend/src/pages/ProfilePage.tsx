import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { getProfile, setupMFA, enableMFA, disableMFA } from '../services/authService';
import { SDM, MFASetupResponse } from '../types';
import { useRelativeTime, formatAbsoluteTime } from '../hooks/useRelativeTime';
import {
    Shield,
    Fingerprint,
    Building2,
    Award,
    GraduationCap,
    Info,
    Mail,
    User,
    CheckCircle2,
    Lock,
    QrCode,
    Smartphone,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const ProfilePage: React.FC = () => {
    const { user, updateUser, isAdmin } = useAuth();
    const [sdmData, setSdmData] = useState<SDM | null>(null);
    const [loading, setLoading] = useState(true);

    // Realtime relative timestamps
    const loginLabel = useRelativeTime(user?.last_login_at);
    const activityLabel = useRelativeTime(user?.last_activity_at);
    // MFA States
    const [showMFAModal, setShowMFAModal] = useState(false);
    const [mfaData, setMfaData] = useState<MFASetupResponse | null>(null);
    const [mfaToken, setMfaToken] = useState('');
    const [mfaLoading, setMfaLoading] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        nomor_hp: '',
        foto: ''
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const data = await getProfile();
            setSdmData(data.sdm);
            setFormData({
                email: data.sdm.email || user?.email || '',
                nomor_hp: data.sdm.nomor_hp || '',
                foto: data.sdm.foto || '',
            });
            // Update auth context with latest user data (for mfa_enabled status)
            if (data.user) {
                updateUser(data.user);
            }
        } catch (error) {
            console.error(error);
            toast.error('Gagal memuat profil');
        } finally {
            setLoading(false);
        }
    };

    // MFA Handlers
    const handleSetupMFA = async () => {
        setMfaLoading(true);
        try {
            const data = await setupMFA();
            setMfaData(data);
            setShowMFAModal(true);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal menyiapkan MFA');
        } finally {
            setMfaLoading(false);
        }
    };

    const handleEnableMFA = async () => {
        if (mfaToken.length !== 6) return;
        setMfaLoading(true);
        try {
            await enableMFA(mfaToken);
            toast.success('MFA Berhasil diaktifkan!');
            setShowMFAModal(false);
            setMfaToken('');
            fetchProfile();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Token tidak valid');
        } finally {
            setMfaLoading(false);
        }
    };

    const handleDisableMFA = async () => {
        if (!window.confirm('Apakah Anda yakin ingin menonaktifkan MFA? Keamanan akun Anda akan berkurang.')) return;
        setMfaLoading(true);
        try {
            await disableMFA();
            toast.success('MFA Dinonaktifkan');
            fetchProfile();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal menonaktifkan MFA');
        } finally {
            setMfaLoading(false);
        }
    };

    if (loading) {
        return <Layout title="Profil"><div className="loading-spinner mx-auto mt-20" /></Layout>;
    }

    return (
        <Layout
            title="Profil Saya"
            subtitle={isAdmin ? "Kelola informasi profil dan detail akun Anda di sini." : "Detail informasi profil dan akun resmi Anda."}
        >
            <div className="max-w-6xl mx-auto space-y-8">
                {/* ═══════════════════════════════════════════
                    HERO: Profile Glass Bento
                ═══════════════════════════════════════════ */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-[3rem] bg-white/70 backdrop-blur-3xl border border-white/60 shadow-[0_20px_60px_rgb(0,0,0,0.06)] group"
                >
                    <div className="absolute inset-0 opacity-20 pointer-events-none">
                        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-indigo-500 blur-[100px]" />
                        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-emerald-500 blur-[100px]" />
                    </div>

                    <div className="relative z-10 p-10 flex flex-col md:flex-row items-center gap-10">
                        {/* Avatar */}
                        <div className="relative group shrink-0">
                            <div className="h-32 w-32 md:h-40 md:w-40 rounded-[2.5rem] bg-gradient-to-br from-indigo-500 to-indigo-700 p-1.5 shadow-2xl transform transition-transform group-hover:scale-[1.05] group-hover:rotate-2">
                                <div className="h-full w-full rounded-[2.2rem] bg-white/10 backdrop-blur-md flex items-center justify-center overflow-hidden border border-white/20">
                                    {formData.foto ? (
                                        <img src={formData.foto} alt="Profile" className="h-full w-full object-cover" />
                                    ) : (
                                        <User size={64} className="text-white" />
                                    )}
                                </div>
                            </div>
                            <div className="absolute -bottom-2 -right-2 h-12 w-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-lg text-emerald-500 transition-transform group-hover:scale-110">
                                <CheckCircle2 size={24} strokeWidth={3} />
                            </div>
                        </div>

                        {/* Name & Title */}
                        <div className="flex-1 min-w-0 text-center md:text-left">
                            <div className="space-y-4">
                                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                                    {sdmData?.nama || 'Pengguna'}
                                </h2>
                                <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                    <span className="inline-flex items-center gap-2 rounded-2xl bg-indigo-50 px-5 py-2 text-[11px] font-black text-indigo-700 border border-indigo-100 uppercase tracking-widest shadow-sm">
                                        <Shield size={16} strokeWidth={3} /> {user?.role || 'Personil APIP'}
                                    </span>
                                    <div className="flex items-center gap-3 text-slate-600 font-black px-5 py-2 rounded-2xl border border-slate-100 bg-white shadow-sm text-xs tracking-wider">
                                        <Fingerprint size={16} className="text-indigo-400" strokeWidth={3} />
                                        <span className="font-mono">{user?.nip}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-8 flex flex-col gap-2.5">
                                <div className="flex items-center justify-center md:justify-start gap-3 text-slate-600 font-bold text-xl md:text-2xl">
                                    <Building2 size={28} className="text-indigo-400" />
                                    <span>{sdmData?.jabatan || 'Unit Kerja Belum Terdaftar'}</span>
                                </div>
                                <p className="text-sm text-slate-500 font-medium md:pl-10">{sdmData?.unit_kerja || 'Inspektorat Jenderal'}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Master Data Section */}
                    <div className="lg:col-span-12 xl:col-span-7 space-y-8">
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="card overflow-hidden"
                        >
                            <div className="px-8 py-6 border-b border-indigo-100 flex items-center justify-between bg-indigo-50/20">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-sm">
                                        <Fingerprint size={22} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Fundamental Identity</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Sinkronisasi Database Master Kepegawaian</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-6">
                                        <div className="group">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-indigo-500 transition-colors">Nama Lengkap</p>
                                            <div className="bg-slate-50/50 px-5 py-4 rounded-2xl border border-slate-100 text-sm font-black text-slate-800 transition-all group-hover:bg-white group-hover:shadow-sm">
                                                {sdmData?.nama || '-'}
                                            </div>
                                        </div>
                                        <div className="group">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-indigo-500 transition-colors">Pangkat / Golongan</p>
                                            <div className="flex items-center gap-3 bg-slate-50/50 px-5 py-4 rounded-2xl border border-slate-100 text-sm font-black text-slate-800 transition-all group-hover:bg-white group-hover:shadow-sm">
                                                <Award size={18} className="text-amber-500" strokeWidth={2.5} />
                                                <span>{sdmData?.pangkat_golongan || '-'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="group">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-indigo-500 transition-colors">NIP / Identitas Akun</p>
                                            <div className="bg-indigo-50/30 px-5 py-4 rounded-2xl border border-indigo-100/50 text-sm font-black text-indigo-700 tracking-wider font-mono transition-all group-hover:bg-indigo-50">
                                                {user?.nip}
                                            </div>
                                        </div>
                                        <div className="group">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-indigo-500 transition-colors">Pendidikan Terakhir</p>
                                            <div className="flex items-center gap-3 bg-slate-50/50 px-5 py-4 rounded-2xl border border-slate-100 text-sm font-black text-slate-800 transition-all group-hover:bg-white group-hover:shadow-sm">
                                                <GraduationCap size={18} className="text-blue-500" strokeWidth={2.5} />
                                                <span>{sdmData?.pendidikan || '-'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 group">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-indigo-500 transition-colors">Alamat Unit Kerja</p>
                                        <div className="flex items-center gap-3 bg-slate-50/50 px-5 py-4 rounded-2xl border border-slate-100 text-sm font-black text-slate-800 transition-all group-hover:bg-white group-hover:shadow-sm">
                                            <Building2 size={18} className="text-indigo-500" strokeWidth={2.5} />
                                            <span>{sdmData?.unit_kerja || 'Inspektorat Jenderal'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 bg-amber-50/50 rounded-[1.5rem] p-5 border border-amber-100 flex gap-4 items-start">
                                    <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-amber-500 shadow-sm shrink-0">
                                        <Info size={20} strokeWidth={2.5} />
                                    </div>
                                    <div className="text-xs text-amber-800 leading-relaxed font-bold">
                                        <p className="mb-1 text-[10px] uppercase tracking-wider">Integritas Data Master</p>
                                        <p className="opacity-80">Data di atas disinkronisasi langsung dari database kepegawaian. Jika terdapat kekeliruan, silakan hubungi bagian Kepegawaian (Admin Utama) untuk melakukan pemutakhiran data master.</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Recent Session Bento Card */}
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card p-8 group"
                        >
                            <div className="flex items-center gap-4 mb-8">
                                <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                    <Shield size={24} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Security Timeline</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Log Akses Keamanan Terakhir</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Terakhir Diakses</p>
                                    <p className="text-xl font-black text-indigo-600 leading-tight mb-2">{loginLabel}</p>
                                    <p className="text-[11px] font-bold text-slate-500 bg-slate-50 inline-block px-3 py-1 rounded-lg">{formatAbsoluteTime(user?.last_login_at)}</p>
                                </div>
                                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Log Aktivitas</p>
                                    <p className="text-xl font-black text-emerald-600 leading-tight mb-2">{activityLabel}</p>
                                    <p className="text-[11px] font-bold text-slate-500 bg-slate-50 inline-block px-3 py-1 rounded-lg">{formatAbsoluteTime(user?.last_activity_at)}</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Security & MFA Settings */}
                    <div className="lg:col-span-12 xl:col-span-5 space-y-8">
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="card p-8 group flex flex-col"
                        >
                            <div className="flex items-center gap-4 mb-8">
                                <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500" title="Security Setting">
                                    <Lock size={24} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Security Hardening</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Otentikasi Dua Faktor (MFA)</p>
                                </div>
                            </div>

                            <div className="space-y-6 flex-1">
                                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
                                    <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-125 transition-transform duration-1000">
                                        <Fingerprint size={100} />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`h-3 w-3 rounded-full ${user?.mfa_enabled ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]'}`}></div>
                                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60">Status Proteksi</span>
                                        </div>
                                        <h4 className="text-3xl font-black mb-2 tracking-tight">{user?.mfa_enabled ? 'Akun Aman' : 'Perlu Proteksi'}</h4>
                                        <p className="text-xs text-slate-400 mb-8 leading-relaxed font-medium">
                                            {user?.mfa_enabled
                                                ? "Otentifikasi Berlapis (2FA) telah aktif menggunakan Google Authenticator."
                                                : "Aktifkan MFA untuk mencegah akses tidak sah meskipun kata sandi Anda diketahui orang lain."}
                                        </p>

                                        {user?.mfa_enabled ? (
                                            <button
                                                onClick={handleDisableMFA}
                                                disabled={mfaLoading}
                                                className="w-full bg-slate-800 hover:bg-rose-600 text-white/80 hover:text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border border-slate-700 hover:border-rose-500"
                                            >
                                                {mfaLoading ? 'Memproses...' : 'Nonaktifkan Keamanan'}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleSetupMFA}
                                                disabled={mfaLoading}
                                                className="w-full bg-white text-slate-900 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl hover:scale-[1.03] active:scale-95"
                                            >
                                                {mfaLoading ? 'Memproses...' : 'Aktifkan MFA Sekarang'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 pl-1">
                                        <Mail size={14} className="text-indigo-500" strokeWidth={3} /> Email Autentikasi
                                    </label>
                                    <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black text-slate-500 cursor-not-allowed flex items-center justify-between">
                                        <span className="truncate">{formData.email}</span>
                                        <Lock size={14} className="opacity-30" />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-10 pt-8 border-t border-slate-100 text-center">
                                <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.3em]">SDM APIP SECURE ACCESS</p>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* MFA Setup Modal Bento Glass */}
                <AnimatePresence>
                    {showMFAModal && mfaData && createPortal(
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0" 
                                onClick={() => !mfaLoading && setShowMFAModal(false)} 
                            />
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="relative bg-white w-full max-w-sm rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.4)] overflow-hidden"
                            >
                                <div className="bg-slate-900 p-8 text-center text-white relative">
                                    <div className="h-16 w-16 rounded-[1.5rem] bg-indigo-500 mx-auto mb-6 flex items-center justify-center shadow-xl shadow-indigo-500/20">
                                        <Shield size={32} className="text-white" strokeWidth={2.5} />
                                    </div>
                                    <h3 className="text-2xl font-black italic tracking-tight">Setup MFA</h3>
                                    <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Proteksi Akun Tingkat Tinggi</p>
                                </div>

                                <div className="p-8 space-y-8 bg-white">
                                    <div className="flex flex-col items-center text-center space-y-6">
                                        {/* QR Code */}
                                        <div className="flex flex-col items-center space-y-4">
                                            <div className="p-4 bg-slate-50 rounded-[2.5rem] border border-slate-100 shadow-inner relative group flex items-center justify-center">
                                                <img 
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(mfaData.qr_url)}`} 
                                                    alt="MFA QR" 
                                                    className="h-40 w-40 object-contain rounded-2xl" 
                                                />
                                                <div className="absolute inset-x-0 bottom-0 bg-white/90 backdrop-blur-md py-2 flex items-center justify-center gap-2 translate-y-full group-hover:translate-y-0 transition-transform cursor-pointer">
                                                    <QrCode size={14} className="text-indigo-500" />
                                                    <span className="text-[10px] font-black text-slate-800 uppercase">Perbesar</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5 px-4">
                                                <p className="text-[11px] font-bold text-slate-700 leading-relaxed">
                                                    Gunakan aplikasi <strong className="text-indigo-600">Google Authenticator</strong> untuk memindai kode di atas.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Verification Section */}
                                        <div className="w-full space-y-5">
                                            <div className="group cursor-default">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Manual Entry Key</p>
                                                <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-dashed border-slate-200 flex justify-between items-center group-hover:bg-white group-hover:border-indigo-300 transition-all">
                                                    <code className="text-[13px] font-black text-indigo-600 tracking-widest uppercase select-all">{mfaData.secret}</code>
                                                    <Smartphone size={16} className="text-slate-300" />
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest block">Input 6-Digit Token</label>
                                                <input
                                                    type="text"
                                                    maxLength={6}
                                                    value={mfaToken}
                                                    onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, ''))}
                                                    className="w-full text-center text-4xl font-black tracking-[0.4em] py-5 bg-indigo-50/50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-[2rem] outline-none transition-all placeholder:text-slate-200"
                                                    placeholder="000000"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={handleEnableMFA}
                                            disabled={mfaLoading || mfaToken.length !== 6}
                                            className="w-full bg-slate-900 text-white py-5 rounded-[1.8rem] text-sm font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 disabled:opacity-30 disabled:shadow-none"
                                        >
                                            {mfaLoading ? 'Memverifikasi...' : 'Aktifkan Sekarang'}
                                        </button>
                                        <button
                                            onClick={() => setShowMFAModal(false)}
                                            className="w-full py-4 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] hover:text-rose-500 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <X size={14} /> Batalkan Proses
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>,
                        document.body
                    )}
                </AnimatePresence>
            </div>
        </Layout>
    );
};

export default ProfilePage;
