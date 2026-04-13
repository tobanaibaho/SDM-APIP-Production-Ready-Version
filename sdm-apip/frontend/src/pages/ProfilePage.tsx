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
    CheckCircle2
} from 'lucide-react';
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
            <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
                {/* Hero Header */}
                <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 shadow-2xl">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute -top-16 -left-16 h-48 w-48 rounded-full bg-primary-500 blur-3xl animate-pulse"></div>
                        <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-accent-500 blur-3xl"></div>
                    </div>

                    <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-center gap-6 md:gap-10">
                        {/* Avatar */}
                        <div className="relative group shrink-0">
                            <div className="h-32 w-32 md:h-36 md:w-36 lg:h-40 lg:w-40 rounded-3xl bg-white p-1 shadow-2xl transform transition-transform group-hover:scale-[1.02]">
                                <div className="h-full w-full rounded-[1.4rem] bg-slate-100 flex items-center justify-center overflow-hidden">
                                    {formData.foto ? (
                                        <img src={formData.foto} alt="Profile" className="h-full w-full object-cover" />
                                    ) : (
                                        <User size={60} className="text-slate-300" />
                                    )}
                                </div>
                            </div>
                            <div className="absolute -bottom-2 -right-2 h-10 w-10 md:h-12 md:w-12 rounded-xl bg-accent-500 border-4 border-slate-900 flex items-center justify-center shadow-xl">
                                <CheckCircle2 size={20} className="text-slate-900" />
                            </div>
                        </div>

                        {/* Name & Title */}
                        <div className="flex-1 min-w-0 text-center md:text-left">
                            <div className="flex flex-col gap-2">
                                <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight break-words leading-tight">
                                    {sdmData?.nama || 'Pengguna'}
                                </h2>
                                <div className="flex justify-center md:justify-start">
                                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-accent-400 backdrop-blur-md border border-white/10 uppercase tracking-widest w-max">
                                        <Shield size={14} />
                                        {user?.role || 'Personil APIP'}
                                    </span>
                                </div>
                            </div>
                            <p className="text-lg md:text-xl lg:text-2xl text-slate-400 font-medium max-w-2xl break-words leading-snug">{sdmData?.jabatan || 'Jabatan Belum Terdata'}</p>

                            <div className="mt-6 flex flex-col sm:flex-row flex-wrap justify-center md:justify-start gap-3">
                                <div className="flex items-center gap-2.5 text-slate-300 bg-white/5 px-4 py-2.5 rounded-xl text-sm md:text-base border border-white/5 backdrop-blur-sm shadow-inner">
                                    <Fingerprint size={18} className="text-accent-500 shrink-0" />
                                    <span className="font-mono truncate">{user?.nip}</span>
                                </div>
                                <div className="flex items-center gap-2.5 text-slate-300 bg-white/5 px-4 py-2.5 rounded-xl text-sm md:text-base border border-white/5 backdrop-blur-sm shadow-inner">
                                    <Building2 size={18} className="text-accent-500 shrink-0" />
                                    <span className="truncate max-w-[200px] sm:max-w-md">{sdmData?.unit_kerja || 'Inspektorat'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Master Data Section */}
                    <div className="lg:col-span-12 xl:col-span-7 space-y-5">
                        <div className="card p-6">
                            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100">
                                <div className="h-8 w-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600">
                                    <Fingerprint size={18} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">Data Fundamental Pegawai</h3>
                                    <p className="text-xs text-slate-500">Informasi resmi di database master.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nama Lengkap</p>
                                        <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-bold text-slate-800">
                                            {sdmData?.nama || '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Pangkat / Golongan</p>
                                        <div className="flex items-center gap-2 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-bold text-slate-800">
                                            <Award size={16} className="text-amber-500" />
                                            <span>{sdmData?.pangkat_golongan || '-'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">NIP / Identitas</p>
                                        <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-mono font-bold text-slate-800 tracking-tight">
                                            {user?.nip}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Pendidikan Terakhir</p>
                                        <div className="flex items-center gap-2 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-bold text-slate-800">
                                            <GraduationCap size={16} className="text-blue-500" />
                                            <span>{sdmData?.pendidikan || '-'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Unit Kerja Utama</p>
                                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-bold text-slate-800">
                                        <Building2 size={16} className="text-primary-500" />
                                        <span>{sdmData?.unit_kerja || 'Inspektorat'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 bg-amber-50 rounded-xl p-3 border border-amber-100 flex gap-3 items-start">
                                <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                <div className="text-xs text-amber-800 leading-relaxed font-medium">
                                    <strong>Catatan Integritas Data:</strong> Data di atas disinkronisasi langsung dari database kepegawaian. Jika terdapat kekeliruan, silakan hubungi bagian Kepegawaian (Admin Utama) untuk melakukan pemutakhiran data master.
                                </div>
                            </div>
                        </div>

                        {/* Activity Log Activity */}
                        <div className="card p-6">
                            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100">
                                <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                                    <Shield size={18} />
                                </div>
                                <h3 className="text-lg font-black text-slate-900">Aktivitas Sesi Terakhir</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Login Terakhir</p>
                                    <p className="text-xs font-black text-primary-600">{loginLabel}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">{formatAbsoluteTime(user?.last_login_at)}</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Aktivitas Terakhir</p>
                                    <p className="text-xs font-black text-emerald-600">{activityLabel}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">{formatAbsoluteTime(user?.last_activity_at)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Account Settings Section */}
                    <div className="lg:col-span-12 xl:col-span-5 space-y-5">
                        <div className="card p-6 flex flex-col">
                            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100">
                                <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                                    <Info size={18} />
                                </div>
                                <h3 className="text-lg font-black text-slate-900">Keamanan & MFA</h3>
                            </div>

                            <div className="space-y-5 flex-1">
                                <div className="bg-slate-900 rounded-[1.5rem] p-5 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-3 opacity-10">
                                        <Fingerprint size={60} />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className={`h-2.5 w-2.5 rounded-full ${user?.mfa_enabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                            <span className="text-[10px] font-black uppercase tracking-widest">Status 2FA</span>
                                        </div>
                                        <h4 className="text-xl font-black mb-1">{user?.mfa_enabled ? 'Aktif' : 'Non-Aktif'}</h4>
                                        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                                            {user?.mfa_enabled
                                                ? "Akun Anda terlindungi dengan verifikasi dua faktor. Sangat aman."
                                                : "Tambahkan lapisan keamanan ekstra dengan aplikasi autentikator."}
                                        </p>

                                        {user?.mfa_enabled ? (
                                            <button
                                                onClick={handleDisableMFA}
                                                disabled={mfaLoading}
                                                className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border border-red-500/30"
                                            >
                                                {mfaLoading ? 'Memproses...' : 'Nonaktifkan MFA'}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleSetupMFA}
                                                disabled={mfaLoading}
                                                className="w-full bg-accent-500 hover:bg-accent-400 text-slate-900 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-accent-500/20"
                                            >
                                                {mfaLoading ? 'Memproses...' : 'Setup Authenticator'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Mail size={14} className="text-primary-500" /> Email Terdaftar
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none cursor-not-allowed"
                                        readOnly
                                    />
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter italic text-center">Hubungi Admin untuk perubahan data fundamental.</p>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                                <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.2em]">Inspektorat &mdash; Kemenko Infrastruktur &amp; Pembangunan Kewilayahan</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MFA Setup Modal, injected globally to body to bypass relative overflows */}
                {showMFAModal && mfaData && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                        <div className="absolute inset-0" onClick={() => !mfaLoading && setShowMFAModal(false)}></div>
                        <div className="relative bg-white w-full max-w-sm mx-auto rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="bg-slate-900 p-5 text-center text-white relative">
                                <Shield size={32} className="mx-auto mb-2 text-accent-500" />
                                <h3 className="text-lg font-black mb-1 italic">Setup Autentikator</h3>
                                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">Satu langkah menuju keamanan maksimal</p>
                            </div>

                            <div className="p-5 md:p-6 space-y-5 bg-slate-50/50">
                                <div className="flex flex-col items-center text-center space-y-4">
                                    {/* QR Code */}
                                    <div className="flex flex-col items-center space-y-2">
                                        <div className="p-2.5 bg-white rounded-[1.2rem] border-2 border-slate-100 shadow-sm relative group overflow-hidden">
                                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(mfaData.qr_url)}`} alt="MFA QR" className="h-32 w-32 object-contain" />
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-medium max-w-[200px] leading-relaxed">
                                            Scan QR menggunakan aplikasi <strong className="text-slate-800">Google Authenticator</strong> / <strong className="text-slate-800">Authy</strong>.
                                        </p>
                                    </div>

                                    {/* Backup Key & Input Kode */}
                                    <div className="w-full space-y-3">
                                        <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Backup Key</span>
                                            <code className="text-xs font-black text-primary-600 tracking-widest uppercase select-all">{mfaData.secret}</code>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-center block">Masukkan 6 Digit</label>
                                            <input
                                                type="text"
                                                maxLength={6}
                                                value={mfaToken}
                                                onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, ''))}
                                                className="w-full text-center text-3xl font-black tracking-[0.4em] py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-accent-500 focus:ring-4 focus:ring-accent-500/10 outline-none transition-all placeholder:text-slate-200"
                                                placeholder="000000"
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-2 border-t border-slate-100">
                                    <button
                                        onClick={() => setShowMFAModal(false)}
                                        className="flex-1 py-4 text-slate-400 text-xs font-black uppercase tracking-widest hover:text-slate-600 transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={handleEnableMFA}
                                        disabled={mfaLoading || mfaToken.length !== 6}
                                        className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50"
                                    >
                                        {mfaLoading ? 'Verifikasi...' : 'Aktifkan Sekarang'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </Layout>
    );
};

export default ProfilePage;
