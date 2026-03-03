import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
    BarChart3,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    Info,
    Eye,
    EyeOff,
} from 'lucide-react';

interface IndicatorReference {
    peer_avg: number;
    bawahan_avg: number;
    overall_avg: number;
}

interface AssessmentReference {
    target: {
        name: string;
        nip: string;
        jabatan: string;
    };
    period_name: string;
    summary: {
        peer_count: number;
        bawahan_count: number;
        peer_avg: number;
        bawahan_avg: number;
        overall_avg: number;
    };
    indicators: Record<string, IndicatorReference>;
    is_ready: boolean;
    warning: string;
}

interface Props {
    targetUserId: string | null;
    periodId: string | null;
    relationType: string | null;
    evaluatorJabatan?: string | null;
}

const INDICATOR_ORDER = [
    'Berorientasi Pelayanan',
    'Akuntabel',
    'Kompeten',
    'Harmonis',
    'Loyal',
    'Adaptif',
    'Kolaboratif',
];

/* Warna progress bar berdasarkan nilai */
const barBg = (v: number) =>
    v >= 80 ? 'bg-emerald-500' : v >= 65 ? 'bg-amber-400' : 'bg-indigo-400';

/* Warna teks skor */
const scoreColor = (v: number) =>
    v >= 80 ? 'text-emerald-600' : v >= 65 ? 'text-amber-600' : v > 0 ? 'text-slate-700' : 'text-slate-300';

/* Label kategori nilai */
const scoreLabel = (v: number) =>
    v >= 80 ? 'Baik' : v >= 65 ? 'Cukup' : v > 0 ? 'Kurang' : '—';

const AssessmentReferencePanel: React.FC<Props> = ({ targetUserId, periodId, relationType, evaluatorJabatan }) => {
    const { user } = useAuth();
    const [data, setData] = useState<AssessmentReference | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(true);

    const jabatan = evaluatorJabatan || user?.jabatan || '';
    const isAtasan = relationType === 'Atasan' && jabatan.toLowerCase().includes('inspektur');

    useEffect(() => {
        if (!isAtasan || !targetUserId || !periodId) return;
        const fetchReference = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await api.get(`/user/assessments/reference/${targetUserId}?period_id=${periodId}`);
                setData(res.data?.data || null);
            } catch (err: any) {
                if (err?.response?.status === 403) {
                    setData(null);
                } else {
                    setError('Tidak dapat memuat data referensi.');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchReference();
    }, [targetUserId, periodId, isAtasan]);

    if (!isAtasan) return null;

    /* ── Loading ── */
    if (loading) {
        return (
            <div className="mt-3 flex items-center gap-3 px-4 py-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <Loader2 size={16} className="text-indigo-400 animate-spin shrink-0" />
                <p className="text-xs font-bold text-indigo-500">Memuat data referensi...</p>
            </div>
        );
    }

    /* ── Error ── */
    if (error) {
        return (
            <div className="mt-3 flex items-center gap-3 px-4 py-3 bg-red-50 rounded-xl border border-red-100">
                <AlertTriangle size={15} className="text-red-400 shrink-0" />
                <p className="text-xs font-semibold text-red-600">{error}</p>
            </div>
        );
    }

    /* ── No data ── */
    if (!data) {
        return (
            <div className="mt-3 flex items-start gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Info size={15} className="text-slate-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-xs font-black text-slate-600 uppercase tracking-wide">Referensi Belum Tersedia</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Belum ada penilaian rekan yang masuk pada periode ini.</p>
                </div>
            </div>
        );
    }

    const { summary, indicators, is_ready, warning } = data;
    const totalPenilai = summary.peer_count + summary.bawahan_count;

    return (
        <div className="mt-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 overflow-hidden shadow-sm">

            {/* ── Header ── */}
            <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-indigo-50/50 transition-colors"
            >
                <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-indigo-600 text-white shadow-sm">
                        <BarChart3 size={14} />
                    </span>
                    <div className="text-left">
                        <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 leading-none">Referensi Penilaian</p>
                        <p className="text-sm font-black text-slate-800 leading-tight mt-0.5">Nilai Gabungan Rekan</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {is_ready ? (
                        <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-full text-[9px] font-black uppercase">
                            <CheckCircle2 size={10} /> Lengkap
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-600 border border-amber-200 rounded-full text-[9px] font-black uppercase">
                            <AlertTriangle size={10} /> Sebagian
                        </span>
                    )}
                    {expanded
                        ? <EyeOff size={14} className="text-slate-400" />
                        : <Eye size={14} className="text-slate-400" />
                    }
                </div>
            </button>

            {/* ── Body ── */}
            {expanded && (
                <div className="border-t border-indigo-100 px-4 pb-4 pt-3 space-y-3">

                    {/* Warning */}
                    {!is_ready && warning && (
                        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                            <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] font-semibold text-amber-700 leading-relaxed">{warning}</p>
                        </div>
                    )}

                    {/* ── Overall Score — satu angka besar yang mencolok ── */}
                    <div className="flex items-center gap-4 p-3 bg-white rounded-xl border border-indigo-100">
                        {/* Score besar */}
                        <div className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-md shadow-indigo-200/50 shrink-0">
                            <p className={`text-2xl font-black leading-none text-white`}>
                                {summary.overall_avg > 0 ? summary.overall_avg.toFixed(1) : '—'}
                            </p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-indigo-200 mt-0.5">
                                {scoreLabel(summary.overall_avg)}
                            </p>
                        </div>
                        {/* Konteks */}
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-700">Nilai Gabungan</p>
                            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                Rata-rata dari <strong className="text-slate-600">{totalPenilai} penilai</strong> yang telah mengisi kuesioner BerAKHLAK pada periode ini.
                            </p>
                            {/* Mini progress bar */}
                            <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${barBg(summary.overall_avg)}`}
                                    style={{ width: `${Math.max(0, Math.min(100, summary.overall_avg))}%` }}
                                />
                            </div>
                            <p className={`text-[9px] font-black mt-1 ${scoreColor(summary.overall_avg)}`}>
                                {summary.overall_avg > 0 ? `${summary.overall_avg.toFixed(1)} / 100` : 'Belum ada data'}
                            </p>
                        </div>
                    </div>

                    {/* ── Rincian per Indikator BerAKHLAK ── */}
                    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                                Rincian per Indikator BerAKHLAK
                            </p>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {INDICATOR_ORDER.map((ind) => {
                                const d = indicators[ind];
                                if (!d) return null;
                                const val = d.overall_avg;
                                return (
                                    <div key={ind} className="px-4 py-2.5 flex items-center gap-3">
                                        {/* Nama indikator */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <p className="text-xs font-bold text-slate-700 truncate">{ind}</p>
                                                <span className={`text-xs font-black ml-2 shrink-0 ${scoreColor(val)}`}>
                                                    {val > 0 ? val.toFixed(1) : '—'}
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${barBg(val)}`}
                                                    style={{ width: `${Math.max(0, Math.min(100, val))}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Disclaimer ── */}
                    <div className="flex items-start gap-2 px-3 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                        <Info size={12} className="text-indigo-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-medium text-indigo-600 leading-relaxed">
                            Data ini adalah nilai gabungan anonim. Identitas penilai tidak ditampilkan.
                            Gunakan sebagai <strong>panduan</strong> objektif, bukan patokan mutlak.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssessmentReferencePanel;
