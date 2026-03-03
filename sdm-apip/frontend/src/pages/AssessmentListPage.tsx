import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';
import { AssessmentPeriod } from '../services/assessmentService';
import AssessmentReferencePanel from '../components/AssessmentReferencePanel';
import { useAuth } from '../context/AuthContext';
import { getProfile } from '../services/authService';
import {
    ClipboardCheck,
    ArrowUpRight,
    Shield,
    CheckCircle2,
    TrendingUp,
    Calendar,
    Users,
    BarChart3,
} from 'lucide-react';
import toast from 'react-hot-toast';

const AssessmentListPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [evaluatorJabatan, setEvaluatorJabatan] = useState<string>(user?.jabatan || '');
    const isInspektur = evaluatorJabatan.toLowerCase().includes('inspektur');

    useEffect(() => {
        getProfile().then(data => {
            if (data?.sdm?.jabatan) setEvaluatorJabatan(data.sdm.jabatan);
            else if (data?.user?.jabatan) setEvaluatorJabatan(data.user.jabatan);
        }).catch(() => { /* silent */ });
    }, []);

    const [periods, setPeriods] = useState<AssessmentPeriod[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
    const [matrix, setMatrix] = useState<any[]>([]);
    const [targets, setTargets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchPeriods(); }, []);
    useEffect(() => { if (selectedPeriod) fetchData(); }, [selectedPeriod]);

    const fetchPeriods = async () => {
        try {
            const res = await api.get('/user/periods');
            const periodsData = Array.isArray(res.data?.data) ? res.data.data : [];
            setPeriods(periodsData);
            if (periodsData.length > 0) {
                const active = periodsData.find((p: any) => p.is_active);
                setSelectedPeriod(active ? active.id : periodsData[0].id);
            }
        } catch {
            toast.error('Gagal memuat periode penilaian');
            setPeriods([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [matrixRes, targetsRes] = await Promise.all([
                api.get(`/user/assessments/matrix?period_id=${selectedPeriod}`),
                api.get(`/user/assessments/targets?period_id=${selectedPeriod}`),
            ]);
            setMatrix(Array.isArray(matrixRes.data?.data) ? matrixRes.data.data : []);
            setTargets(Array.isArray(targetsRes.data?.data) ? targetsRes.data.data : []);
        } catch {
            toast.error('Gagal memuat data penilaian');
            setMatrix([]);
            setTargets([]);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: number) => {
        if (status === 0) return <span className="text-slate-400 text-xs">—</span>;
        let count = 0;
        if (status & 1) count++;
        if (status & 2) count++;
        if (status & 4) count++;
        return (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-bold">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {count} Kategori
            </div>
        );
    };

    /* ── Avatar colour determined by initial ── */
    const avatarColor = (name: string) => {
        const colors = [
            'from-blue-400 to-blue-600',
            'from-violet-400 to-violet-600',
            'from-rose-400 to-rose-600',
            'from-amber-400 to-amber-600',
            'from-teal-400 to-teal-600',
            'from-indigo-400 to-indigo-600',
        ];
        const i = (name?.charCodeAt(0) ?? 0) % colors.length;
        return colors[i];
    };

    return (
        <Layout title="Penilaian 360°" subtitle="Kelola penilaian dan pantau status kelengkapan Anda.">
            <div className="space-y-10 animate-fade-in">

                {/* ── Header row ── */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Antrian Penilaian</h2>
                        <p className="text-slate-500 mt-1 text-sm font-medium">
                            Pengisian kuesioner BerAKHLAK secara real-time.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm w-fit">
                        <Calendar size={15} className="text-primary-500 shrink-0" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Periode</span>
                        <select
                            className="text-sm font-bold text-slate-700 bg-transparent border-none focus:ring-0 cursor-pointer"
                            value={selectedPeriod || ''}
                            onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                        >
                            {periods.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="py-24 flex flex-col items-center gap-3">
                        <div className="loading-spinner" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Sinkronisasi data...</p>
                    </div>
                ) : (
                    <>
                        {/* ════════════════════════════════════════
                            SECTION: Daftar Evaluasi Rekan Kerja
                        ════════════════════════════════════════ */}
                        <section className="space-y-5">
                            <div className="flex items-center gap-3">
                                <span className="flex items-center justify-center h-9 w-9 bg-primary-600 rounded-xl text-white shadow-lg shadow-primary-200">
                                    <TrendingUp size={18} />
                                </span>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 leading-tight">Daftar Evaluasi Rekan Kerja</h3>
                                    <p className="text-xs text-slate-400 font-medium">Pegawai yang perlu Anda nilai pada periode ini</p>
                                </div>
                            </div>

                            {targets.length === 0 ? (
                                <div className="py-20 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center gap-3">
                                    <div className="h-16 w-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300">
                                        <ClipboardCheck size={32} />
                                    </div>
                                    <div>
                                        <h4 className="text-base font-black text-slate-400 uppercase tracking-widest">Antrian Kosong</h4>
                                        <p className="text-xs text-slate-300 mt-1">Belum ada penugasan penilaian di periode ini</p>
                                    </div>
                                </div>
                            ) : (
                                /* Untuk Inspektur: layout card horizontal (nama + referensi panel side-by-side)
                                   Untuk user biasa: grid card kecil */
                                isInspektur ? (
                                    <div className="space-y-4">
                                        {targets.map((t) => {
                                            const monthsDone: number[] = t.months_done || [];
                                            const monthsRequired: number = t.months_required || 1;
                                            const isFullyDone: boolean = t.is_done;
                                            const isPartiallyDone = monthsDone.length > 0 && !isFullyDone;
                                            const nextMonth = Array.from({ length: monthsRequired }, (_, i) => i + 1)
                                                .find(m => !monthsDone.includes(m)) || 1;
                                            const name = t.relation?.target_user?.name || 'Unknown';
                                            const jabatan = t.relation?.target_user?.jabatan || 'Personil APIP';
                                            const isAtasan = t.relation?.relation_type === 'Atasan';

                                            return (
                                                <div
                                                    key={t.relation?.id || Math.random()}
                                                    className={`relative rounded-2xl border transition-all duration-200 overflow-hidden ${isFullyDone
                                                        ? 'bg-emerald-50/40 border-emerald-100'
                                                        : isPartiallyDone
                                                            ? 'bg-amber-50/30 border-amber-200'
                                                            : 'bg-white border-slate-200 hover:border-primary-200 hover:shadow-md'
                                                        }`}
                                                >
                                                    {/* Accent stripe */}
                                                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${isFullyDone ? 'bg-emerald-400' : isPartiallyDone ? 'bg-amber-400' : 'bg-primary-500'}`} />

                                                    <div className="flex flex-col lg:flex-row lg:items-start gap-0 pl-3">

                                                        {/* ── LEFT: Info pegawai + action ── */}
                                                        <div className="flex flex-col justify-between p-5 lg:w-72 shrink-0">
                                                            {/* Avatar + nama */}
                                                            <div className="flex items-start gap-4">
                                                                <div className={`shrink-0 h-12 w-12 rounded-2xl bg-gradient-to-br ${avatarColor(name)} text-white font-black text-xl flex items-center justify-center uppercase shadow-md`}>
                                                                    {name.charAt(0)}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <h4 className="font-black text-slate-900 text-sm leading-tight line-clamp-2">{name}</h4>
                                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1 truncate">{jabatan}</p>
                                                                    {/* Status badge */}
                                                                    <div className="mt-2">
                                                                        {isFullyDone ? (
                                                                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
                                                                                <CheckCircle2 size={10} /> Selesai
                                                                            </span>
                                                                        ) : isPartiallyDone ? (
                                                                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                                                                                ⏳ Bln {nextMonth} menunggu
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded-full">
                                                                                📋 Belum diisi
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Monthly bubbles */}
                                                            {monthsRequired > 1 && (
                                                                <div className="flex flex-wrap items-center gap-1 mt-4">
                                                                    {Array.from({ length: monthsRequired }, (_, i) => i + 1).map(month => (
                                                                        <div
                                                                            key={month}
                                                                            title={monthsDone.includes(month) ? `Bulan ${month} ✓` : `Bulan ${month} — belum`}
                                                                            className={`flex flex-col items-center justify-center w-9 h-9 rounded-xl text-[8px] font-black transition-all ${monthsDone.includes(month)
                                                                                ? 'bg-emerald-500 text-white'
                                                                                : month === nextMonth && !isFullyDone
                                                                                    ? 'bg-amber-400 text-white ring-2 ring-amber-300 ring-offset-1 animate-pulse'
                                                                                    : 'bg-slate-100 text-slate-400'
                                                                                }`}
                                                                        >
                                                                            <span className="uppercase leading-none">Bln</span>
                                                                            <span className="text-[10px] font-black">{month}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Action button */}
                                                            <div className="mt-4">
                                                                {isFullyDone ? (
                                                                    <div className="flex items-center gap-1.5 text-emerald-600 font-black text-[10px] uppercase tracking-wider bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100 w-full justify-center">
                                                                        <CheckCircle2 size={14} /> Semua Bulan Selesai
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => navigate(`/user/assessments/new?target_id=${t.relation?.target_user_id}&period_id=${selectedPeriod}&relation=${t.relation?.relation_type}`)}
                                                                        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all hover:scale-[1.02] active:scale-95 shadow-md ${isPartiallyDone
                                                                            ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-amber-200'
                                                                            : 'bg-slate-900 text-white hover:bg-primary-600 shadow-slate-200'
                                                                            }`}
                                                                    >
                                                                        {isPartiallyDone ? `Lanjut Bulan ${nextMonth}` : 'Isi Penilaian Sekarang'}
                                                                        <ArrowUpRight size={15} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* ── Divider ── */}
                                                        <div className="hidden lg:block w-px bg-slate-100 my-5" />
                                                        <div className="block lg:hidden h-px bg-slate-100 mx-5" />

                                                        {/* ── RIGHT: Panel Referensi (hanya untuk relasi Atasan) ── */}
                                                        <div className="flex-1 p-5 min-w-0">
                                                            {isAtasan ? (
                                                                <AssessmentReferencePanel
                                                                    targetUserId={t.relation?.target_user_id ? String(t.relation.target_user_id) : null}
                                                                    periodId={selectedPeriod ? String(selectedPeriod) : null}
                                                                    relationType={t.relation?.relation_type ?? null}
                                                                    evaluatorJabatan={evaluatorJabatan || null}
                                                                />
                                                            ) : (
                                                                /* Untuk relasi Peer/Bawahan — tampilkan info sederhana */
                                                                <div className="h-full flex flex-col items-center justify-center py-6 gap-2 text-center">
                                                                    <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                                                        <BarChart3 size={20} />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-black text-slate-500 uppercase tracking-wide">Penilaian Kolega</p>
                                                                        <p className="text-[11px] text-slate-400 mt-0.5">Panel referensi hanya tersedia untuk relasi Atasan</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    /* Layout standar untuk non-Inspektur */
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {targets.map((t) => {
                                            const monthsDone: number[] = t.months_done || [];
                                            const monthsRequired: number = t.months_required || 1;
                                            const isFullyDone: boolean = t.is_done;
                                            const isPartiallyDone = monthsDone.length > 0 && !isFullyDone;
                                            const nextMonth = Array.from({ length: monthsRequired }, (_, i) => i + 1)
                                                .find(m => !monthsDone.includes(m)) || 1;
                                            const name = t.relation?.target_user?.name || 'Unknown';

                                            return (
                                                <div key={t.relation?.id || Math.random()}
                                                    className={`group p-6 rounded-[2rem] border-2 transition-all duration-300 ${isFullyDone
                                                        ? 'bg-emerald-50/50 border-emerald-100'
                                                        : isPartiallyDone
                                                            ? 'bg-amber-50/30 border-amber-200 shadow-lg hover:-translate-y-1'
                                                            : 'bg-white border-transparent hover:border-primary-500 shadow-xl hover:shadow-2xl hover:-translate-y-1'}`}>
                                                    <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${avatarColor(name)} text-white font-bold text-2xl flex items-center justify-center uppercase shadow-md mb-4`}>
                                                        {name.charAt(0)}
                                                    </div>
                                                    <h4 className="font-black text-slate-900 text-base truncate">{name}</h4>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 mb-4 truncate">
                                                        {t.relation?.target_user?.jabatan || 'Personil APIP'}
                                                    </p>
                                                    {monthsRequired > 1 && (
                                                        <div className="flex items-center gap-1.5 mb-4">
                                                            {Array.from({ length: monthsRequired }, (_, i) => i + 1).map(month => (
                                                                <div key={month}
                                                                    className={`flex flex-col items-center w-9 h-9 rounded-xl text-[8px] font-black justify-center ${monthsDone.includes(month) ? 'bg-emerald-500 text-white' : month === nextMonth && !isFullyDone ? 'bg-amber-400 text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                                                                    <span>Bln</span><span>{month}</span>
                                                                </div>
                                                            ))}
                                                            <span className="text-[10px] font-bold text-slate-400">{monthsDone.length}/{monthsRequired}</span>
                                                        </div>
                                                    )}
                                                    {isFullyDone ? (
                                                        <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase bg-emerald-50 px-4 py-2.5 rounded-2xl border border-emerald-100">
                                                            <CheckCircle2 size={14} /> Selesai
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => navigate(`/user/assessments/new?target_id=${t.relation?.target_user_id}&period_id=${selectedPeriod}&relation=${t.relation?.relation_type}`)}
                                                            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-black transition-all shadow-xl ${isPartiallyDone ? 'bg-amber-500 hover:bg-amber-400 text-white' : 'bg-slate-900 text-white hover:bg-primary-600'} hover:scale-[1.02] active:scale-95`}
                                                        >
                                                            {isPartiallyDone ? `Lanjut Bln ${nextMonth}` : 'Isi Sekarang'} <ArrowUpRight size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                            )}
                        </section>

                        {/* ════════════════════════════════════════
                            SECTION: Status Kelengkapan (Matrix)
                        ════════════════════════════════════════ */}
                        <section className="space-y-5">
                            <div className="flex items-center gap-3">
                                <span className="flex items-center justify-center h-9 w-9 bg-slate-900 rounded-xl text-white shadow-lg">
                                    <ClipboardCheck size={18} />
                                </span>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 leading-tight">Status Kelengkapan</h3>
                                    <p className="text-xs text-slate-400 font-medium">Seberapa banyak penilaian yang sudah masuk untuk Anda</p>
                                </div>
                            </div>

                            <div className="card overflow-hidden !rounded-2xl shadow-xl border border-slate-100">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-950 border-b border-slate-800">
                                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                    <div className="flex items-center gap-2">
                                                        <Users size={13} /> Nama Pegawai
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Penilai Masuk</th>
                                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Progress</th>
                                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Privasi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {matrix.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm">
                                                        Belum ada data
                                                    </td>
                                                </tr>
                                            ) : matrix.map((row) => (
                                                <tr key={row.user_id} className="hover:bg-slate-50/70 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${avatarColor(row.name)} text-white font-black text-sm flex items-center justify-center uppercase shrink-0`}>
                                                                {row.name?.charAt(0) || '?'}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-slate-900 text-sm">{row.name}</p>
                                                                <p className="text-[10px] font-mono text-slate-400">{row.nip}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">{getStatusBadge(row.status)}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-1.5 w-28 bg-slate-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-700 ${(row.completion_pct ?? 0) === 100 ? 'bg-emerald-500' : (row.completion_pct ?? 0) >= 50 ? 'bg-amber-400' : 'bg-primary-500'}`}
                                                                    style={{ width: `${row.completion_pct ?? 0}%` }}
                                                                />
                                                            </div>
                                                            <span className={`text-[10px] font-black ${(row.completion_pct ?? 0) === 100 ? 'text-emerald-600' : (row.completion_pct ?? 0) >= 50 ? 'text-amber-600' : 'text-slate-400'}`}>
                                                                {row.done_count ?? 0}/{row.total_required ?? 0}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-400 rounded-full text-[9px] font-black uppercase border border-slate-200">
                                                            <Shield size={12} /> Anonim
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>
                    </>
                )}
            </div>
        </Layout>
    );
};

export default AssessmentListPage;
