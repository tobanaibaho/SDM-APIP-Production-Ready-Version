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
    TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';

const AssessmentListPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    // Jabatan fresh dari SDM — dipakai oleh AssessmentReferencePanel untuk mendeteksi Inspektur
    const [evaluatorJabatan, setEvaluatorJabatan] = useState<string>(user?.jabatan || '');
    const isInspektur = evaluatorJabatan.toLowerCase().includes('inspektur');

    useEffect(() => {
        getProfile().then(data => {
            if (data?.sdm?.jabatan) setEvaluatorJabatan(data.sdm.jabatan);
            else if (data?.user?.jabatan) setEvaluatorJabatan(data.user.jabatan);
        }).catch(() => {/* silent */ });
    }, []);
    const [periods, setPeriods] = useState<AssessmentPeriod[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
    const [matrix, setMatrix] = useState<any[]>([]);
    const [targets, setTargets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPeriods();
    }, []);

    useEffect(() => {
        if (selectedPeriod) {
            fetchData();
        }
    }, [selectedPeriod]);

    const fetchPeriods = async () => {
        try {
            const res = await api.get('/user/periods');
            const periodsData = Array.isArray(res.data?.data) ? res.data.data : [];
            setPeriods(periodsData);
            if (periodsData.length > 0) {
                const active = periodsData.find((p: any) => p.is_active);
                setSelectedPeriod(active ? active.id : periodsData[0].id);
            }
        } catch (error) {
            console.error(error);
            toast.error('Gagal memuat periode penilaian');
            setPeriods([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Matrix (Status Saya / Status Semua)
            const matrixRes = await api.get(`/user/assessments/matrix?period_id=${selectedPeriod}`);
            setMatrix(Array.isArray(matrixRes.data?.data) ? matrixRes.data.data : []);

            // Fetch Targets (Who I need to assess)
            const targetsRes = await api.get(`/user/assessments/targets?period_id=${selectedPeriod}`);
            setTargets(Array.isArray(targetsRes.data?.data) ? targetsRes.data.data : []);
        } catch (error) {
            console.error('Fetch error:', error);
            toast.error('Gagal memuat data penilaian');
            setMatrix([]);
            setTargets([]);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: number) => {
        if (status === 0) return <span className="text-slate-400">-</span>;

        let count = 0;
        if (status & 1) count++;
        if (status & 2) count++;
        if (status & 4) count++;

        return (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-bold">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                {count} Kategori Penilai
            </div>
        );
    };

    return (
        <Layout
            title="Penilaian 360°"
            subtitle="Kelola penilaian dan pantau status kelengkapan Anda."
        >
            <div className="space-y-8 animate-fade-in">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                            Antrian Penilaian Anda
                        </h2>
                        <p className="text-slate-500 mt-1 font-medium">Data waktu nyata keaktifan pengisian kuesioner BerAKHLAK.</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 group">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Periode</span>
                        <select
                            className="form-input py-1.5 min-w-[200px] border-none focus:ring-0 bg-slate-50 font-bold text-slate-700 rounded-xl"
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
                    <div className="py-20 flex flex-col items-center">
                        <div className="loading-spinner mb-4" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs"> sinkronisasi data...</p>
                    </div>
                ) : (
                    <>
                        {/* Targets (User only) */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                                    <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                                        <TrendingUp size={20} />
                                    </div>
                                    Daftar Evaluasi Rekan Kerja
                                </h3>
                            </div>

                            <div className={`grid gap-6 ${isInspektur ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                                {targets.map((t) => {
                                    const monthsDone: number[] = t.months_done || [];
                                    const monthsRequired: number = t.months_required || 1;
                                    const isFullyDone: boolean = t.is_done;
                                    const isPartiallyDone = monthsDone.length > 0 && !isFullyDone;
                                    // Find the next month that needs to be filled
                                    const nextMonth = Array.from({ length: monthsRequired }, (_, i) => i + 1)
                                        .find(m => !monthsDone.includes(m)) || 1;

                                    return (
                                        <div key={t.relation?.id || Math.random()} className={`group relative overflow-hidden p-6 rounded-[2rem] border-2 transition-all duration-300 ${isFullyDone
                                            ? 'bg-emerald-50/50 border-emerald-100'
                                            : isPartiallyDone
                                                ? 'bg-amber-50/30 border-amber-200 shadow-lg hover:-translate-y-1'
                                                : 'bg-white border-transparent hover:border-blue-500 shadow-xl hover:shadow-2xl hover:-translate-y-1'
                                            }`}>
                                            <div className="relative z-10">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 flex items-center justify-center font-bold text-2xl shadow-inner uppercase">
                                                        {t.relation?.target_user?.name ? t.relation.target_user.name.charAt(0) : '?'}
                                                    </div>

                                                </div>

                                                <h4 className="font-black text-slate-900 text-lg mb-0.5 truncate">{t.relation?.target_user?.name || 'Unknown User'}</h4>
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-4">{t.relation?.target_user?.jabatan || 'Personil APIP'}</p>

                                                {/* Panel Referensi Inspektur — hanya tampil untuk Inspektur dengan relasi Atasan */}
                                                <AssessmentReferencePanel
                                                    targetUserId={t.relation?.target_user_id ? String(t.relation.target_user_id) : null}
                                                    periodId={selectedPeriod ? String(selectedPeriod) : null}
                                                    relationType={t.relation?.relation_type ?? null}
                                                    evaluatorJabatan={evaluatorJabatan || null}
                                                />

                                                {/* Monthly progress bubbles — shown for multi-month periods */}
                                                {monthsRequired > 1 && (
                                                    <div className="flex items-center gap-2 mb-5">
                                                        {Array.from({ length: monthsRequired }, (_, i) => i + 1).map(month => (
                                                            <div
                                                                key={month}
                                                                title={monthsDone.includes(month) ? `Bulan ${month} — Terisi ✓` : `Bulan ${month} — Belum diisi`}
                                                                className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${monthsDone.includes(month)
                                                                    ? 'bg-emerald-500 text-white shadow-sm'
                                                                    : month === nextMonth && !isFullyDone
                                                                        ? 'bg-amber-400 text-white ring-2 ring-amber-300 ring-offset-1 animate-pulse'
                                                                        : 'bg-slate-100 text-slate-400'
                                                                    }`}
                                                            >
                                                                <span>Bln {month}</span>
                                                                {monthsDone.includes(month) && <span>✓</span>}
                                                            </div>
                                                        ))}
                                                        <span className="text-[10px] font-bold text-slate-400 ml-1">
                                                            {monthsDone.length}/{monthsRequired}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Action area */}
                                                {isFullyDone ? (
                                                    <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest bg-emerald-50 px-4 py-2.5 rounded-2xl border border-emerald-100">
                                                        <CheckCircle2 size={16} /> Selesai Semua Bulan
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => navigate(`/user/assessments/new?target_id=${t.relation?.target_user_id}&period_id=${selectedPeriod}&relation=${t.relation?.relation_type}`)}
                                                        className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-black transition-all shadow-xl ${isPartiallyDone
                                                            ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-amber-200 hover:scale-[1.02] active:scale-95'
                                                            : 'bg-slate-900 text-white hover:bg-blue-600 hover:scale-[1.02] active:scale-95 shadow-slate-200'
                                                            }`}
                                                    >
                                                        {isPartiallyDone
                                                            ? <>Lanjut Isi Bulan {nextMonth} <ArrowUpRight size={18} /></>
                                                            : <>Isi Penilaian Sekarang <ArrowUpRight size={18} /></>}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {targets.length === 0 && (
                                    <div className="col-span-full py-20 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center">
                                        <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-4">
                                            <ClipboardCheck size={40} />
                                        </div>
                                        <h4 className="text-xl font-bold text-slate-400 uppercase tracking-widest">Antrian Kosong</h4>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Matrix (Admin and User) */}
                        <div className="space-y-6">
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                                <div className="p-2 bg-slate-900 rounded-xl text-white shadow-lg">
                                    <ClipboardCheck size={20} />
                                </div>
                                Status Kelengkapan Untuk Anda
                            </h3>

                            <div className="card overflow-hidden !rounded-[2rem] border-none shadow-2xl bg-white">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-950 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-900">
                                            <tr>
                                                <th className="px-10 py-6">Nama Pegawai / NIP</th>
                                                <th className="px-10 py-6">Status Penilai Masuk</th>
                                                <th className="px-10 py-6 text-right">Kendali / Detail</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {matrix.map((row) => (
                                                <tr key={row.user_id} className="hover:bg-slate-50/80 transition-all group">
                                                    <td className="px-10 py-6">
                                                        <div className="flex flex-col">
                                                            <span className="font-black text-slate-900 text-base">{row.name}</span>
                                                            <span className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">{row.nip}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-6">
                                                        <div className="flex flex-col gap-2">
                                                            {/* Status badge (penilai yang masuk) */}
                                                            {getStatusBadge(row.status)}
                                                            {/* Real completion progress bar from backend */}
                                                            <div className="mt-1">
                                                                <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 mb-1">
                                                                    <span>Progres Penilai</span>
                                                                    <span className={`font-black ${(row.completion_pct ?? 0) === 100 ? 'text-emerald-600' :
                                                                        (row.completion_pct ?? 0) >= 50 ? 'text-amber-600' : 'text-slate-400'
                                                                        }`}>
                                                                        {row.done_count ?? 0}/{row.total_required ?? 0}
                                                                    </span>
                                                                </div>
                                                                <div className="h-1.5 w-36 bg-slate-100 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all duration-700 ${(row.completion_pct ?? 0) === 100 ? 'bg-emerald-500' :
                                                                            (row.completion_pct ?? 0) >= 50 ? 'bg-amber-400' : 'bg-primary-500'
                                                                            }`}
                                                                        style={{ width: `${row.completion_pct ?? 0}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-6 text-right">
                                                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200">
                                                            <Shield size={14} /> Data Pribadi
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
};

export default AssessmentListPage;
