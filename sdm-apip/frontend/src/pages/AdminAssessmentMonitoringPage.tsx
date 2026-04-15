import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

import {
    ClipboardCheck,
    Users,
    CheckCircle2,
    AlertTriangle,
    Search,
    TrendingUp,
    ShieldCheck,
    Activity,
    ChevronDown,
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
                <div className="relative overflow-hidden bg-white/50 backdrop-blur-xl border border-white/50 shadow-sm rounded-3xl p-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
                    <div className="relative flex items-start gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-2xl shrink-0">
                            <ShieldCheck size={24} className="text-blue-600" />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-slate-900 mb-1">Mode Pengawas Administrator</h4>
                            <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                                Halaman ini hanya untuk <span className="font-bold text-slate-700">memantau</span> progress penilaian pegawai.
                                Admin tidak berpartisipasi dalam proses penilaian 360° dan tidak masuk dalam grup manapun.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Period Selector ── */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm p-2 pl-4 rounded-2xl shadow-sm border border-slate-200 w-fit">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Periode</span>
                        <div className="relative">
                            <select
                                id="periodFilter"
                                name="periodFilter"
                                className="appearance-none form-input py-1.5 pr-8 min-w-[220px] border-none focus:ring-0 bg-transparent font-bold text-slate-700 rounded-xl text-sm cursor-pointer"
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
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-black uppercase tracking-wider border border-emerald-100">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Periode Aktif
                        </span>
                    )}
                </div>

                {/* ── Summary Stats Row ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'Rata-rata Progress', val: `${avgPct}%`, color: 'text-primary-600', icon: Activity },
                        { label: 'Selesai', val: done, color: 'text-emerald-600', icon: CheckCircle2 },
                        { label: 'Sebagian', val: partial, color: 'text-amber-600', icon: TrendingUp },
                        { label: 'Belum Dinilai', val: none, color: 'text-rose-500', icon: AlertTriangle },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white/80 backdrop-blur-sm p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{stat.label}</p>
                            <h3 className={`text-3xl font-black ${stat.color}`}>{stat.val}</h3>
                        </div>
                    ))}
                </div>

                {/* ── Matrix Table ── */}
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary-50 rounded-xl">
                                <ClipboardCheck size={16} className="text-primary-600" />
                            </div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Matriks Kelengkapan</h3>
                        </div>
                        <div className="relative w-full sm:w-72">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Cari nama atau NIP..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-primary-500/20 outline-none bg-slate-50/50"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-20 flex flex-col items-center gap-3">
                            <div className="loading-spinner" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Memuat data...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-20 text-center">
                            <Users size={40} className="mx-auto text-slate-200 mb-3" />
                            <p className="text-sm font-bold text-slate-400">Data tidak ditemukan</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
                                    <tr>
                                        <th className="px-6 py-4">Pegawai</th>
                                        <th className="px-6 py-4">Status Penilai</th>
                                        <th className="px-6 py-4">Progress</th>
                                        <th className="px-6 py-4 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filtered.map(row => {
                                        const pct = row.completion_pct ?? 0;
                                        return (
                                            <tr key={row.user_id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="font-black text-slate-900 text-sm">{row.name}</p>
                                                    <p className="text-[11px] font-mono text-slate-400">{row.nip}</p>
                                                </td>
                                                <td className="px-6 py-4">{getStatusBadge(row.status)}</td>
                                                <td className="px-6 py-4">
                                                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => navigate(`/admin/assessments/detail/${row.user_id}?period_id=${selectedPeriod}`)}
                                                        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-slate-800 transition-all"
                                                    >
                                                        Detail
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!loading && filtered.length > 0 && (
                        <div className="px-8 py-5 border-t border-slate-100/50 flex items-center gap-8 bg-slate-50/30">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Keterangan:</span>
                            {[
                                { color: 'bg-emerald-500', label: 'Selesai (100%)' },
                                { color: 'bg-amber-400',   label: 'Sebagian (>0%)' },
                                { color: 'bg-slate-200',   label: 'Belum Ada' },
                            ].map(({ color, label }) => (
                                <div key={label} className="flex items-center gap-2">
                                    <div className={`h-3 w-3 rounded-full ${color} shadow-sm`} />
                                    <span className="text-[10px] font-black text-slate-500">{label}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </Layout>
    );
};

export default AdminAssessmentMonitoringPage;
