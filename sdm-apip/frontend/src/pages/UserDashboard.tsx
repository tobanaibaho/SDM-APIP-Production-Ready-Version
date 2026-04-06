import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { getProfile } from '../services/authService';
import groupService from '../services/groupService';
import assessmentService, { AssessmentPeriod } from '../services/assessmentService';
import AssessmentReferencePanel from '../components/AssessmentReferencePanel';
import RoleBadge from '../components/RoleBadge';
import api from '../services/api';
import { SDM, Group } from '../types';
import { useNavigate } from 'react-router-dom';
import {
    Building2,
    Shield,
    X,
    Users as UsersIcon,
    ArrowUpRight,
    Star,
    ClipboardCheck,
    CheckCircle2,
    Clock,
    UserCircle2,
    Fingerprint,
    User,
    TrendingUp,
    AlertCircle,
    ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─────────────────────── Types ─────────────────────── */
interface AssessmentTarget {
    relation: {
        id: number;
        target_user_id: number;
        relation_type: 'Atasan' | 'Peer' | 'Bawahan';
        target_position: 'Atasan' | 'Peer' | 'Bawahan';
        target_user: {
            id: number;
            name: string;
            jabatan?: string;
            foto?: string;
        };
    };
    is_done: boolean;
    months_done: number[];
    months_required: number;
}

/* ─────────────────────── Helpers ─────────────────────── */
/* ─────────────────────── Component ─────────────────────── */
const UserDashboard: React.FC = () => {
    const { user, activePeriod } = useAuth();
    const navigate = useNavigate();

    const [sdmData, setSdmData] = useState<SDM | null>(null);
    const [loading, setLoading] = useState(true);
    const [targetsLoading, setTargetsLoading] = useState(false);
    const [myGroups, setMyGroups] = useState<Group[]>([]);
    const [showGroupDetailModal, setShowGroupDetailModal] = useState(false);
    const [selectedGroupDetail, setSelectedGroupDetail] = useState<any>(null);
    const [periods, setPeriods] = useState<AssessmentPeriod[]>([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
    const [targets, setTargets] = useState<AssessmentTarget[]>([]);

    /* ── Initial load ── */
    useEffect(() => {
        const init = async () => {
            try {
                setLoading(true);
                const [profile, groups, allPeriods] = await Promise.all([
                    getProfile(),
                    groupService.getMyGroups(),
                    assessmentService.getAllPeriods(),
                ]);
                setSdmData(profile.sdm);
                setMyGroups(groups || []);
                setPeriods(allPeriods);

                const active = allPeriods.find((p: AssessmentPeriod) => p.is_active)
                    ?? (activePeriod ? allPeriods.find((p: AssessmentPeriod) => p.id === activePeriod.id) : null)
                    ?? allPeriods[0];
                if (active) setSelectedPeriodId(active.id);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    /* ── Fetch targets whenever period changes ── */
    const fetchTargets = useCallback(async (periodId: number) => {
        try {
            setTargetsLoading(true);
            const res = await api.get(`/user/assessments/targets?period_id=${periodId}`);
            setTargets(Array.isArray(res.data?.data) ? res.data.data : []);
        } catch {
            setTargets([]);
        } finally {
            setTargetsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedPeriodId) fetchTargets(selectedPeriodId);
    }, [selectedPeriodId, fetchTargets]);

    /* ── Group detail modal ── */
    const handleGroupClick = async (groupId: number) => {
        try {
            const detail = await groupService.getGroupDetailForUser(groupId);
            setSelectedGroupDetail(detail);
            setShowGroupDetailModal(true);
        } catch {
            toast.error('Gagal memuat detail grup');
        }
    };

    /* ── Derived stats ── */
    const totalForms = targets.reduce((sum, t) => sum + t.months_required, 0);
    const doneForms = targets.reduce((sum, t) => sum + t.months_done.length, 0);
    const pct = totalForms > 0 ? Math.round((doneForms / totalForms) * 100) : 0;
    const remaining = totalForms - doneForms;
    const partial = targets.filter(t => !t.is_done && t.months_done.length > 0).length;
    const selectedPeriod = periods.find(p => p.id === selectedPeriodId);

    /* ── Loading state ── */
    if (loading) {
        return (
            <Layout title="Dashboard">
                <div className="flex justify-center items-center h-64">
                    <div className="loading-spinner" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Dashboard" subtitle="Selamat datang di sistem manajemen SDM APIP.">
            <div className="space-y-8 animate-fade-in">

                {/* ═══════════════════════════════════════════
                    BANNER: Periode Aktif
                ═══════════════════════════════════════════ */}
                {activePeriod && (
                    <div
                        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 p-6 shadow-lg shadow-primary-600/20 group hover:to-primary-800 transition-all cursor-pointer"
                        onClick={() => navigate('/user/assessments')}
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                            <ClipboardCheck size={120} />
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                    <ClipboardCheck size={20} className="text-accent-400" />
                                    Penilaian Aktif: {activePeriod.name}
                                </h3>
                                <p className="text-primary-100 mt-1 text-sm">
                                    {remaining > 0
                                        ? `${remaining} formulir penilaian masih menunggu pengisian Anda.`
                                        : 'Semua formulir sudah terisi. Terima kasih!'}
                                </p>
                            </div>
                            <button className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-primary-700 shadow-xl transition-all hover:scale-105 active:scale-95 group-hover:bg-accent-500 group-hover:text-slate-900 shrink-0">
                                {remaining > 0 ? 'Mulai Penilaian' : 'Lihat Penilaian'}
                                <ArrowUpRight size={18} />
                            </button>
                        </div>
                        {/* inline progress bar */}
                        {totalForms > 0 && (
                            <div className="relative z-10 mt-4">
                                <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-accent-400 rounded-full transition-all duration-700"
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-primary-200 mt-1 font-bold">{doneForms}/{totalForms} formulir — {pct}% selesai</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══════════════════════════════════════════
                    HERO: Profile Card
                ═══════════════════════════════════════════ */}
                <div className="relative overflow-hidden rounded-3xl bg-slate-900 shadow-2xl">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-primary-500 blur-3xl" />
                        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-accent-500 blur-3xl" />
                    </div>
                    <div className="relative z-10 flex flex-col items-center gap-6 p-8 md:flex-row md:p-10">
                        {/* Avatar */}
                        <div className="shrink-0 h-28 w-28 rounded-3xl bg-gradient-to-br from-accent-400 to-accent-600 font-bold text-slate-900 text-3xl shadow-lg ring-4 ring-white/10 overflow-hidden flex items-center justify-center">
                            {sdmData?.foto
                                ? <img src={sdmData.foto} alt="Profile" className="h-full w-full object-cover" />
                                : (sdmData?.nama?.charAt(0).toUpperCase() || 'U')}
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center md:text-left">
                            <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
                                <h2 className="text-3xl font-black text-white tracking-tight">{sdmData?.nama || 'Pengguna'}</h2>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300 backdrop-blur-md border border-white/10 uppercase tracking-widest">
                                    <Shield size={12} className="text-accent-400" /> Personil APIP
                                </span>
                            </div>
                            <p className="mt-2 text-lg text-slate-400 font-medium">{sdmData?.jabatan || 'Unit Kerja Belum Terdaftar'}</p>
                            <div className="mt-4 flex flex-wrap justify-center gap-3 md:justify-start">
                                <div className="flex items-center gap-2 text-slate-300 bg-white/5 px-4 py-2 rounded-xl text-sm border border-white/5">
                                    <Fingerprint size={16} className="text-accent-500" />
                                    <span className="font-mono">{user?.nip}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-300 bg-white/5 px-4 py-2 rounded-xl text-sm border border-white/5">
                                    <Building2 size={16} className="text-accent-500" />
                                    <span>{sdmData?.unit_kerja || 'Inspektorat'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Status & action */}
                        <div className="shrink-0 flex flex-col items-center gap-3">
                            <button
                                onClick={() => navigate('/profile')}
                                className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 transition-all hover:bg-slate-100 hover:scale-105 active:scale-95 shadow-xl"
                            >
                                <User size={18} className="text-primary-600" /> Profil
                            </button>
                            <div className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full ${user?.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${user?.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                                {user?.status === 'active' ? 'Akun Aktif' : 'Menunggu Verifikasi'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════
                    MAIN GRID
                ═══════════════════════════════════════════ */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* ── LEFT: Status Kelengkapan Penilaian ── */}
                    <div className="lg:col-span-8">
                        <div className="card overflow-hidden h-full">
                            {/* Header */}
                            <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
                                <div className="flex items-center gap-2">
                                    <Star size={20} className="text-amber-500" />
                                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">Antrian Tugas Penilaian</h3>
                                </div>
                                <select
                                    className="text-xs font-bold border border-slate-200 bg-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-300 cursor-pointer"
                                    value={selectedPeriodId || ''}
                                    onChange={e => setSelectedPeriodId(Number(e.target.value))}
                                >
                                    {periods.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} ({new Date(p.start_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="p-6">
                                {targetsLoading ? (
                                    <div className="flex justify-center items-center py-16">
                                        <div className="loading-spinner" />
                                    </div>
                                ) : targets.length === 0 ? (
                                    /* ── Empty state ── */
                                    <div className="py-16 text-center rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50/50">
                                        <div className="mb-5 relative inline-block">
                                            <div className="h-20 w-20 rounded-full bg-white shadow-xl flex items-center justify-center mx-auto text-primary-400 relative z-10">
                                                <ClipboardCheck size={40} />
                                            </div>
                                            <div className="absolute inset-0 bg-primary-400 rounded-full blur-2xl opacity-10 scale-150 animate-pulse" />
                                        </div>
                                        <h4 className="text-xl font-black text-slate-700 mb-2">Belum Ada Penugasan Penilaian</h4>
                                        <p className="text-slate-400 text-sm max-w-sm mx-auto">
                                            Anda belum ditetapkan sebagai penilai di periode ini. Hubungi Admin untuk konfigurasi relasi penilaian.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {/* ── Summary Stats Row ── */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                                            <div className="bg-slate-50 rounded-2xl p-4 text-center">
                                                <p className="text-2xl font-black text-slate-900">{totalForms}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Total Formulir</p>
                                            </div>
                                            <div className="bg-emerald-50 rounded-2xl p-4 text-center">
                                                <p className="text-2xl font-black text-emerald-600">{doneForms}</p>
                                                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-0.5">Terisi</p>
                                            </div>
                                            <div className="bg-amber-50 rounded-2xl p-4 text-center">
                                                <p className="text-2xl font-black text-amber-600">{partial}</p>
                                                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mt-0.5">Sebagian</p>
                                            </div>
                                            <div className={`${remaining > 0 ? 'bg-red-50' : 'bg-emerald-50'} rounded-2xl p-4 text-center`}>
                                                <p className={`text-2xl font-black ${remaining > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{remaining}</p>
                                                <p className={`text-[10px] font-bold ${remaining > 0 ? 'text-red-400' : 'text-emerald-400'} uppercase tracking-widest mt-0.5`}>Sisa</p>
                                            </div>
                                        </div>

                                        {/* ── Overall Progress Bar ── */}
                                        <div className="mb-6">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold text-slate-500">Progress Keseluruhan</span>
                                                <span className={`text-xs font-black ${pct === 100 ? 'text-emerald-600' : pct > 50 ? 'text-amber-600' : 'text-primary-600'}`}>{pct}%</span>
                                            </div>
                                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-700"
                                                    style={{
                                                        width: `${pct}%`,
                                                        background: pct === 100 ? '#10b981' : pct > 50 ? '#f59e0b' : '#6366f1',
                                                    }}
                                                />
                                            </div>
                                            {selectedPeriod && selectedPeriod.frequency !== 'monthly' && (
                                                <p className="text-[10px] text-slate-400 mt-1.5">
                                                    Periode <span className="font-bold">{selectedPeriod.name}</span> — wajib diisi <span className="font-bold">{targets[0]?.months_required ?? '?'} bulan</span> per target
                                                </p>
                                            )}
                                        </div>

                                        {/* ── Target Cards ── */}
                                        <div className="space-y-3">
                                            {targets.map(t => {
                                                const { months_done, months_required, is_done, relation } = t;
                                                const isPartial = months_done.length > 0 && !is_done;
                                                const nextMonth = Array.from({ length: months_required }, (_, i) => i + 1)
                                                    .find(m => !months_done.includes(m)) ?? 1;
                                                const userName = relation?.target_user?.name ?? 'Unknown';
                                                const jabatan = relation?.target_user?.jabatan ?? '';

                                                return (
                                                    <div
                                                        key={relation?.id}
                                                        className={`rounded-2xl border transition-all overflow-hidden ${is_done
                                                            ? 'bg-emerald-50/60 border-emerald-100'
                                                            : isPartial
                                                                ? 'bg-amber-50/50 border-amber-200 hover:border-amber-300'
                                                                : 'bg-white border-slate-100 hover:border-primary-200 hover:shadow-md'
                                                            }`}
                                                    >
                                                        {/* Top row: Avatar + Nama + Bulan + Action */}
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4">
                                                            {/* Avatar */}
                                                            <div className="shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center uppercase">
                                                                {userName.charAt(0)}
                                                            </div>

                                                            {/* Name + jabatan */}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-bold text-slate-900 text-sm truncate">{userName}</p>
                                                                {jabatan && <p className="text-xs text-slate-400 truncate mt-0.5">{jabatan}</p>}
                                                            </div>

                                                            {/* Monthly bubbles */}
                                                            {months_required > 1 && (
                                                                <div className="flex items-center gap-1.5 shrink-0">
                                                                    {Array.from({ length: months_required }, (_, i) => i + 1).map(m => (
                                                                        <div
                                                                            key={m}
                                                                            title={months_done.includes(m) ? `Bulan ${m} ✓` : `Bulan ${m} — belum diisi`}
                                                                            className={`flex flex-col items-center gap-0.5 w-10 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${months_done.includes(m)
                                                                                ? 'bg-emerald-500 text-white'
                                                                                : m === nextMonth && !is_done
                                                                                    ? 'bg-amber-400 text-white ring-2 ring-amber-300 ring-offset-1 animate-pulse'
                                                                                    : 'bg-slate-100 text-slate-400'
                                                                                }`}
                                                                        >
                                                                            <span>Bln</span>
                                                                            <span>{m}</span>
                                                                            {months_done.includes(m) && <span>✓</span>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Action */}
                                                            {is_done ? (
                                                                <div className="shrink-0 flex items-center gap-1.5 text-emerald-600 bg-emerald-100 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase">
                                                                    <CheckCircle2 size={13} /> Selesai
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => navigate(
                                                                        `/user/assessments/new?target_id=${relation?.target_user_id}&period_id=${selectedPeriodId}&relation=${relation?.relation_type}`
                                                                    )}
                                                                    className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all hover:scale-105 active:scale-95 ${isPartial
                                                                        ? 'bg-amber-500 text-white hover:bg-amber-400'
                                                                        : 'bg-slate-900 text-white hover:bg-primary-600'
                                                                        }`}
                                                                >
                                                                    {isPartial ? `Lanjut Bln ${nextMonth}` : 'Isi Sekarang'}
                                                                    <ChevronRight size={14} />
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Panel Referensi — full width di bawah, hanya untuk relasi Atasan */}
                                                        {relation?.relation_type === 'Atasan' && sdmData?.jabatan?.toLowerCase().includes('inspektur') && (
                                                            <div className="px-4 pb-4 border-t border-slate-100">
                                                                <AssessmentReferencePanel
                                                                    targetUserId={relation?.target_user_id ? String(relation.target_user_id) : null}
                                                                    periodId={selectedPeriodId ? String(selectedPeriodId) : null}
                                                                    relationType={relation?.relation_type ?? null}
                                                                    evaluatorJabatan={sdmData?.jabatan ?? null}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* ── Bottom CTA jika ada yang sisa ── */}
                                        {remaining > 0 && (
                                            <div className="mt-5 p-4 bg-primary-50 rounded-2xl border border-primary-100 flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-primary-700">
                                                    <AlertCircle size={16} />
                                                    <p className="text-sm font-bold">{remaining} formulir belum selesai diisi</p>
                                                </div>
                                                <button
                                                    onClick={() => navigate('/user/assessments')}
                                                    className="flex items-center gap-1.5 text-xs font-black text-primary-700 hover:text-primary-900 transition-colors uppercase tracking-wider"
                                                >
                                                    Lihat Semua <ArrowUpRight size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT: Groups & Status ── */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* Account Status */}
                        <div className={`card p-5 border-l-4 ${user?.status === 'active' ? 'border-l-green-500' : 'border-l-amber-500'}`}>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Status Penggunaan</h4>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`h-2 w-2 rounded-full ${user?.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
                                        <span className="text-sm font-bold text-slate-700">
                                            {user?.status === 'active' ? 'Akun Aktif'
                                                : user?.status === 'email_verified' ? 'Email Terverifikasi'
                                                    : 'Menunggu Verifikasi'}
                                        </span>
                                    </div>
                                    {user?.status === 'active'
                                        ? <CheckCircle2 size={16} className="text-green-500" />
                                        : <Clock size={16} className="text-amber-500" />}
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="h-2 w-2 rounded-full bg-primary-500" />
                                        <span className="text-sm font-bold text-slate-700">Akses APIP</span>
                                    </div>
                                    <Shield size={16} className="text-primary-500" />
                                </div>
                                {totalForms > 0 && (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`h-2 w-2 rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                                            <span className="text-sm font-bold text-slate-700">Penilaian {pct}%</span>
                                        </div>
                                        <TrendingUp size={16} className={pct === 100 ? 'text-emerald-500' : 'text-amber-500'} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* My Groups */}
                        <div className="space-y-3">
                            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                <UsersIcon size={18} className="text-primary-600" />
                                Grup Kerja Saya
                            </h3>
                            {myGroups.length === 0 ? (
                                <div className="card py-8 text-center border-dashed bg-slate-50 shadow-none">
                                    <p className="text-slate-400 text-sm font-bold">Belum Ada Grup</p>
                                    <p className="text-slate-300 text-xs mt-1">Hubungi Admin untuk penugasan</p>
                                </div>
                            ) : (
                                myGroups.map(group => (
                                    <button
                                        key={group.id}
                                        onClick={() => handleGroupClick(group.id)}
                                        className="w-full group card p-4 text-left transition-all hover:ring-2 hover:ring-primary-500/20 hover:shadow-md active:scale-95"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-colors">
                                                    <UsersIcon size={19} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900 group-hover:text-primary-700 transition-colors text-sm truncate w-36">{group.name}</h4>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase">{group.user_count || 0} anggota</p>
                                                        {group.user_role && (
                                                            <RoleBadge role={group.user_role} />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <ArrowUpRight size={16} className="text-slate-300 group-hover:text-primary-500 shrink-0" />
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════
                MODAL: Group Detail
            ═══════════════════════════════════════════ */}
            {showGroupDetailModal && selectedGroupDetail && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="card w-full max-w-3xl max-h-[90vh] flex flex-col animate-slide-up">
                        {/* Modal Header */}
                        <div className="px-7 py-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">{selectedGroupDetail.group?.name}</h3>
                                <p className="text-sm text-slate-400 mt-0.5">{selectedGroupDetail.group?.description || 'Tim Evaluasi Kinerja — Inspektorat'}</p>
                            </div>
                            <button
                                onClick={() => setShowGroupDetailModal(false)}
                                className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-7">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="bg-primary-50 rounded-xl px-4 py-2 flex items-center gap-2">
                                    <UsersIcon size={16} className="text-primary-600" />
                                    <span className="text-sm font-bold text-primary-700">
                                        {selectedGroupDetail.members?.length || 0} Personil
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {selectedGroupDetail.members?.map((member: any) => (
                                    <div
                                        key={member.id}
                                        className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary-200 hover:bg-white hover:shadow-sm transition-all"
                                    >
                                        <div className="h-10 w-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center font-bold text-primary-600 text-sm shrink-0">
                                            {member.name?.charAt(0)?.toUpperCase() || <UserCircle2 size={22} />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-bold text-slate-900 text-sm truncate mr-2">{member.name}</p>
                                                <RoleBadge role={member.group_role} />
                                            </div>
                                            <p className="text-xs text-slate-400 truncate mt-0.5">{member.jabatan || 'Personil APIP'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default UserDashboard;
