import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

import {
    Eye,
    ClipboardCheck,
    Users,
    CheckCircle2,
    AlertTriangle,
    BarChart3,
    Search,
    TrendingUp,
    ShieldCheck,
    Activity,
    ChevronDown,
    Info,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────
   Types
───────────────────────────────────────────────── */
interface MatrixRow {
    user_id: number;
    name: string;
    nip: string;
    jabatan?: string;
    status: number;
    done_count?: number;
    total_required?: number;
    completion_pct?: number;
}

interface PeriodOption {
    id: number;
    name: string;
    is_active: boolean;
}

/* ─────────────────────────────────────────────────
   Status Badge Helper
───────────────────────────────────────────────── */
const getStatusBadge = (status: number) => {
    if (status === 0) return <span className="text-slate-400 text-[11px] font-black uppercase tracking-widest">Belum Ada</span>;
    const results = [];

    // Backend scenario code mapping (1-7):
    const hasA = [1, 3, 4, 7].includes(status);
    const hasP = [1, 2, 4, 6].includes(status);
    const hasB = [1, 2, 3, 5].includes(status);

    if (hasA) results.push(<span key="atasan" className="px-3 py-1 bg-green-100/80 text-green-700 rounded-full text-xs font-black shadow-sm ring-1 ring-inset ring-green-200">Atasan</span>);
    if (hasP) results.push(<span key="peer" className="px-3 py-1 bg-blue-100/80 text-blue-700 rounded-full text-xs font-black shadow-sm ring-1 ring-inset ring-blue-200">Peer</span>);
    if (hasB) results.push(<span key="bawahan" className="px-3 py-1 bg-purple-100/80 text-purple-700 rounded-full text-xs font-black shadow-sm ring-1 ring-inset ring-purple-200">Bawahan</span>);
    
    return <div className="flex gap-2 flex-wrap">{results}</div>;
};

/* ─────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────── */
const AdminAssessmentMonitoringPage: React.FC = () => {
    const navigate = useNavigate();
    const [periods, setPeriods] = useState<PeriodOption[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
    const [matrix, setMatrix] = useState<MatrixRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => { fetchPeriods(); }, []);
    useEffect(() => { if (selectedPeriod) fetchMatrix(); }, [selectedPeriod]);

    const fetchPeriods = async () => {
        try {
            const res = await api.get('/user/periods');
            const data: PeriodOption[] = Array.isArray(res.data?.data) ? res.data.data : [];
            setPeriods(data);
            const active = data.find(p => p.is_active);
            setSelectedPeriod(active ? active.id : data[0]?.id ?? null);
        } catch {
            toast.error('Gagal memuat data periode');
        } finally {
            setLoading(false);
        }
    };

    const fetchMatrix = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/assessments/matrix?period_id=${selectedPeriod}`);
            setMatrix(Array.isArray(res.data?.data) ? res.data.data : []);
        } catch {
            toast.error('Gagal memuat matriks penilaian');
            setMatrix([]);
        } finally {
            setLoading(false);
        }
    };

    /* ── Derived stats ── */
    const total = matrix.length;
    const done = matrix.filter(r => (r.completion_pct ?? 0) >= 100).length;
    const partial = matrix.filter(r => (r.completion_pct ?? 0) > 0 && (r.completion_pct ?? 0) < 100).length;
    const none = matrix.filter(r => (r.completion_pct ?? 0) === 0).length;
    const avgPct = total > 0 ? Math.round(matrix.reduce((s, r) => s + (r.completion_pct ?? 0), 0) / total) : 0;

    const filtered = matrix.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.nip.toLowerCase().includes(search.toLowerCase())
    );

    const selectedPeriodObj = periods.find(p => p.id === selectedPeriod);

    return (
        <Layout
            title="Monitoring Penilaian 360°"
            subtitle="Pantau status kelengkapan pengisian penilaian oleh seluruh pegawai."
        >
            <div className="space-y-6 animate-fade-in">

                {/* ── Admin Observer Banner ── */}
                <div className="flex items-start gap-4 bg-blue-50 border border-blue-200 rounded-2xl px-6 py-4">
                    <div className="p-2 bg-blue-100 rounded-xl shrink-0 mt-0.5">
                        <ShieldCheck size={18} className="text-blue-600" />
                    </div>
                    <div>
                        <p className="text-sm font-black text-blue-800 mb-0.5">Mode Pengawas Administrator</p>
                        <p className="text-xs text-blue-600 leading-relaxed">
                            Halaman ini hanya untuk <span className="font-bold">memantau</span> progress penilaian pegawai.
                            Admin tidak berpartisipasi dalam proses penilaian 360° dan tidak masuk dalam grup manapun.
                            Untuk melihat hasil lengkap, gunakan menu <span className="font-bold">Laporan &amp; Analitik</span>.
                        </p>
                    </div>
                </div>

                {/* ── Period Selector ── */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 bg-white p-2 pl-4 rounded-2xl shadow-sm border border-slate-100 w-fit">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Periode</span>
                        <div className="relative">
                            <select
                                id="periodFilter"
                                name="periodFilter"
                                className="appearance-none form-input py-1.5 pr-8 min-w-[220px] border-none focus:ring-0 bg-slate-50 font-bold text-slate-700 rounded-xl text-sm"
                                value={selectedPeriod || ''}
                                onChange={e => setSelectedPeriod(Number(e.target.value))}
                            >
                                {periods.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}{p.is_active ? ' (Aktif)' : ''}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {selectedPeriodObj?.is_active && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-[11px] font-black uppercase tracking-wider border border-green-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                            Periode Aktif Berjalan
                        </span>
                    )}
                </div>

                {/* ── Summary Stats Row ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {/* Overall Progress */}
                    <div className="card p-5 col-span-2 sm:col-span-1 border-l-4 border-l-primary-500 relative overflow-hidden group">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Rata-rata Progress</p>
                        <h3 className="text-3xl font-black text-slate-900">{avgPct}%</h3>
                        <p className="text-[9px] text-slate-400 mt-1">Keseluruhan pengisian</p>
                        <Activity size={48} className="absolute -right-2 -bottom-3 text-primary-50 group-hover:-rotate-12 transition-all" />
                    </div>
                    {/* Selesai */}
                    <div className="card p-5 border-l-4 border-l-emerald-500 relative overflow-hidden group">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Selesai</p>
                        <h3 className="text-3xl font-black text-emerald-600">{done}</h3>
                        <p className="text-[9px] text-slate-400 mt-1">Dari {total} pegawai</p>
                        <CheckCircle2 size={48} className="absolute -right-2 -bottom-3 text-emerald-50 group-hover:-rotate-12 transition-all" />
                    </div>
                    {/* Sebagian */}
                    <div className="card p-5 border-l-4 border-l-amber-500 relative overflow-hidden group">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sebagian</p>
                        <h3 className="text-3xl font-black text-amber-600">{partial}</h3>
                        <p className="text-[9px] text-slate-400 mt-1">Pengisian belum penuh</p>
                        <TrendingUp size={48} className="absolute -right-2 -bottom-3 text-amber-50 group-hover:-rotate-12 transition-all" />
                    </div>
                    {/* Belum */}
                    <div className="card p-5 border-l-4 border-l-rose-400 relative overflow-hidden group">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Belum Dinilai</p>
                        <h3 className="text-3xl font-black text-rose-500">{none}</h3>
                        <p className="text-[9px] text-slate-400 mt-1">Belum ada penilai masuk</p>
                        <AlertTriangle size={48} className="absolute -right-2 -bottom-3 text-rose-50 group-hover:-rotate-12 transition-all" />
                    </div>
                </div>

                {/* ── Overall Progress Bar ── */}
                <div className="card p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <BarChart3 size={15} className="text-primary-600" />
                            <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Progres Keseluruhan Periode</span>
                        </div>
                        <span className="text-sm font-black text-slate-900">{done} / {total} Selesai</span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                                width: `${total > 0 ? (done / total) * 100 : 0}%`,
                                background: done === total && total > 0 ? '#10b981' : avgPct >= 50 ? '#f59e0b' : '#6366f1'
                            }}
                        />
                    </div>
                    <div className="flex justify-between mt-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>0%</span>
                        <span>{total > 0 ? Math.round((done / total) * 100) : 0}% Tuntas</span>
                        <span>100%</span>
                    </div>
                </div>

                {/* ── Matrix Table ── */}
                <div className="card overflow-hidden">
                    {/* Table Header */}
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <ClipboardCheck size={15} className="text-primary-600" />
                            <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Matriks Kelengkapan Seluruh Pegawai</h3>
                            <span className="ml-1 text-[10px] font-black bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{total}</span>
                        </div>

                        {/* Search */}
                        <div className="relative w-full sm:w-64">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                id="searchInput"
                                name="searchInput"
                                placeholder="Cari nama atau NIP..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-300 outline-none bg-white font-medium text-slate-700"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-20 flex flex-col items-center gap-3">
                            <div className="loading-spinner" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Menyinkronkan data pengawasan...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-20 text-center">
                            <Users size={40} className="mx-auto text-slate-200 mb-3" />
                            <p className="text-sm font-bold text-slate-400">
                                {search ? 'Tidak ada pegawai yang cocok dengan pencarian.' : 'Belum ada data pegawai untuk periode ini.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-950 text-xs font-black uppercase tracking-[0.1em] text-slate-300 border-b border-slate-900">
                                    <tr>
                                        <th className="px-6 py-5">Pegawai / NIP</th>
                                        <th className="px-6 py-5">Penilai Yang Masuk</th>
                                        <th className="px-6 py-5">
                                            <div className="flex items-center gap-1.5">
                                                Progress Kelengkapan
                                                <span title="Persentase berdasarkan jumlah form penilaian yang sudah masuk vs. yang dibutuhkan">
                                                    <Info size={11} className="text-slate-600 cursor-help" />
                                                </span>
                                            </div>
                                        </th>
                                        <th className="px-6 py-5 text-right">Aksi Pengawas</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filtered.map(row => {
                                        const pct = row.completion_pct ?? 0;
                                        const isComplete = pct >= 100;
                                        const isPartial = pct > 0 && pct < 100;

                                        return (
                                            <tr key={row.user_id} className="hover:bg-slate-50/70 transition-colors group">
                                                {/* Identitas */}
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${isComplete ? 'bg-emerald-100 text-emerald-700' :
                                                            isPartial ? 'bg-amber-100 text-amber-700' :
                                                                'bg-slate-100 text-slate-500'
                                                            }`}>
                                                            {row.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-slate-900 text-sm">{row.name}</p>
                                                            {row.jabatan?.toLowerCase().includes('inspektur') ? (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-200 mt-1 shadow-sm">
                                                                    ★ Inspektur
                                                                </span>
                                                            ) : (
                                                                <p className="text-[11px] font-mono font-bold text-slate-500 mt-0.5">{row.nip}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Status badge */}
                                                <td className="px-6 py-5">
                                                    {getStatusBadge(row.status)}
                                                </td>

                                                {/* Progress bar */}
                                                <td className="px-6 py-5">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between text-xs font-black">
                                                            <span className="text-slate-600">
                                                                {row.done_count ?? 0} / {row.total_required ?? 0} form
                                                            </span>
                                                            <span className={`text-sm ${isComplete ? 'text-emerald-600' :
                                                                isPartial ? 'text-amber-600' : 'text-slate-400'
                                                                }`}>
                                                                {pct}%
                                                            </span>
                                                        </div>
                                                        <div className="h-2.5 w-48 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-700 ${isComplete ? 'bg-emerald-500' :
                                                                    isPartial ? 'bg-amber-400' : 'bg-slate-200'
                                                                    }`}
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Aksi */}
                                                <td className="px-6 py-5 text-right">
                                                    <button
                                                        onClick={() => navigate(`/admin/assessments/detail/${row.user_id}?period_id=${selectedPeriod}`)}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider hover:border-primary-500 hover:text-primary-700 hover:bg-primary-50 transition-all group-hover:scale-105 active:scale-95"
                                                    >
                                                        <Eye size={14} />
                                                        Lihat Laporan
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Keterangan legend */}
                    {!loading && filtered.length > 0 && (
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center gap-6">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Keterangan:</span>
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-sm" />
                                <span className="text-xs font-black text-slate-600">Selesai (100%)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-amber-400 shadow-sm" />
                                <span className="text-xs font-black text-slate-600">Sebagian (&gt;0%)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-slate-200 shadow-sm" />
                                <span className="text-xs font-black text-slate-600">Belum Ada</span>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </Layout>
    );
};

export default AdminAssessmentMonitoringPage;
